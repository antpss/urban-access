const mongoose = require('mongoose');
const SegnalazionePrivata = require('../models/SegnalazionePrivata');
const Cittadino = require('../models/Cittadino');
const ValidazioneSegnalazione = require('../models/ValidazioneSegnalazione');

const SCORE_MAX = 14;        // cap scoreAffidabilita (vincolo schema Cittadino)
const PAYOUT_POOL = 10;      // monte-punti distribuito alla validazione

//POST /api/v1/privateReports/:id/validations

exports.validatePrivateReport = async (req, res) => {
    const reportId = req.params.id;
    const userId = req.loggedUser.userId;

    const HEX24 = /^[a-fA-F0-9]{24}$/;
    if (!HEX24.test(reportId)) {
        return res.status(400).json({
            error: 'Validazione fallita',
            details: [{ field: 'id', message: 'ObjectId segnalazione non valido' }]
        });
    }

    let session = null;
    let useTransaction = false;
    try {
        session = await mongoose.startSession();
        try {
            session.startTransaction();
            useTransaction = true;
        } catch (txErr) {
            useTransaction = false;
        }

        //carico la segnalazione (deve essere privata)
        const segnalazione = await SegnalazionePrivata
            .findById(reportId)
            .session(useTransaction ? session : null);

        if (!segnalazione) {
            await abort(session, useTransaction);
            return res.status(404).json({ error: 'Segnalazione privata non trovata' });
        }

        //non validabile se bloccata o in stati terminali/di lavorazione
        if (segnalazione.bloccaModifica || ['RISOLTA', 'ARCHIVIATA', 'PRESA_IN_CARICO'].includes(segnalazione.stato)) {
            await abort(session, useTransaction);
            return res.status(409).json({ error: 'Segnalazione non validabile nello stato corrente' });
        }

        //divieto di auto-validazione
        if (String(segnalazione.autore) === String(userId)) {
            await abort(session, useTransaction);
            return res.status(403).json({ error: 'Non puoi validare una tua segnalazione' });
        }

        //carico il votante per conoscere il suo scoreAffidabilita
        const votante = await Cittadino
            .findById(userId)
            .session(useTransaction ? session : null);

        if (!votante) {
            await abort(session, useTransaction);
            return res.status(403).json({ error: 'Solo un cittadino può validare' });
        }
        const pesoVoto = votante.scoreAffidabilita;

        const giaValidata = segnalazione.stato === 'APERTA';

        //creazione voto: unique index protegge dal doppio voto
        let voto;
        try {
            const creati = await ValidazioneSegnalazione.create([{
                segnalazione: segnalazione._id,
                validatore: userId,
                tipo: 'conferma',
                pesoVoto,
                haContribuitoAllaValidazione: false
            }], useTransaction ? { session } : {});
            voto = creati[0];
        } catch (dupErr) {
            if (dupErr && dupErr.code === 11000) {
                await abort(session, useTransaction);
                return res.status(409).json({ error: 'Hai già validato questa segnalazione' });
            }
            throw dupErr;
        }

        if (!segnalazione.listaValidatori.some(v => String(v) === String(userId))) {
            segnalazione.listaValidatori.push(userId);
        }

        //caso: segnalazione già APERTA -> voto registrato, nessun payout
        if (giaValidata) {
            segnalazione.scoreAssociato += pesoVoto;
            await segnalazione.save(useTransaction ? { session } : {});
            await commit(session, useTransaction);
            return res.status(200).json({
                message: 'Voto registrato (segnalazione già validata, nessun punteggio assegnato)',
                statoSegnalazione: segnalazione.stato,
                scoreAssociato: segnalazione.scoreAssociato
            });
        }

        segnalazione.scoreAssociato += pesoVoto;

        let payoutResult;

        //check soglia
        if (segnalazione.scoreAssociato >= segnalazione.sogliaValidazione) {
            //snapshot validatori fino a ora (incluso questo voto)
            const votiContribuenti = await ValidazioneSegnalazione
                .find({ segnalazione: segnalazione._id })
                .session(useTransaction ? session : null);

            const N = votiContribuenti.length;
            const payout = Math.floor(PAYOUT_POOL / N);   // interi, arrotondati per difetto

            //transizione: il pre('validate') consente APERTA perché soglia raggiunta
            segnalazione.stato = 'APERTA';
            await segnalazione.save(useTransaction ? { session } : {});

            //marca i voti come contribuenti
            await ValidazioneSegnalazione.updateMany(
                { _id: { $in: votiContribuenti.map(v => v._id) } },
                { $set: { haContribuitoAllaValidazione: true } },
                useTransaction ? { session } : {}
            );

            //payout one-shot, clamp a SCORE_MAX; salva i punti effettivi per il reversal futuro
            const cittadini = await Cittadino
                .find({ _id: { $in: votiContribuenti.map(v => v.validatore) } })
                .session(useTransaction ? session : null);

            const votoByValidatore = new Map(votiContribuenti.map(v => [String(v.validatore), v]));
            for (const c of cittadini) {
                const prima = c.scoreAffidabilita;
                const nuovo = Math.min(prima + payout, SCORE_MAX);
                c.scoreAffidabilita = nuovo;
                await c.save(useTransaction ? { session } : {});

                const voto = votoByValidatore.get(String(c._id));
                if (voto) {
                    voto.puntiAssegnati = nuovo - prima;   // effettivi post-clamp
                    await voto.save(useTransaction ? { session } : {});
                }
            }

            payoutResult = { validata: true, numValidatori: N, puntiPerValidatore: payout };
        } else {
            await segnalazione.save(useTransaction ? { session } : {});
            payoutResult = {
                validata: false,
                scoreMancante: segnalazione.sogliaValidazione - segnalazione.scoreAssociato
            };
        }

        await commit(session, useTransaction);

        return res.status(201).json({
            message: payoutResult.validata
                ? 'Validazione completata: segnalazione confermata e punti distribuiti'
                : 'Voto registrato, soglia non ancora raggiunta',
            statoSegnalazione: segnalazione.stato,
            scoreAssociato: segnalazione.scoreAssociato,
            sogliaValidazione: segnalazione.sogliaValidazione,
            ...payoutResult
        });

    } catch (err) {
        await abort(session, useTransaction);
        if (err.name === 'ValidationError') {
            const details = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
            return res.status(400).json({ error: 'Validazione fallita', details });
        }
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Validazione fallita', details: [{ field: err.path, message: 'tipo non valido' }] });
        }
        console.error('[POST /privateReports/:id/validations]', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    } finally {
        if (session) session.endSession();
    }
};

async function commit(session, useTransaction) {
    if (session && useTransaction) await session.commitTransaction();
}
async function abort(session, useTransaction) {
    if (session && useTransaction) {
        try { await session.abortTransaction(); } catch (_) { /* già abortita */ }
    }
}