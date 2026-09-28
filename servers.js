const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Variável com a chave de acesso da sua conta do Mercado Pago
const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_TOKEN;

// Rota para gerar o Pix automático
app.post('/api/criar-pix', async (req, res) => {
    try {
        const { valor, descricao, email } = req.body;

        const response = await axios.post(
            'https://api.mercadopago.com/v1/payments',
            {
                transaction_amount: Number(valor),
                description: descricao || 'Compra de Rifas',
                payment_method_id: 'pix',
                payer: {
                    email: email || 'cliente@email.com'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const paymentData = response.data;
        const qrCode = paymentData.point_of_interaction.transaction_data.qr_code;
        const qrCodeBase64 = paymentData.point_of_interaction.transaction_data.qr_code_base64;

        res.json({
            sucesso: true,
            idPagamento: paymentData.id,
            qrCode: qrCode,
            qrCodeBase64: qrCodeBase64
        });
    } catch (error) {
        console.error('Erro ao gerar Pix:', error.response ? error.response.data : error.message);
        res.status(500).json({ sucesso: false, erro: 'Erro ao gerar cobrança Pix' });
    }
});

// Rota para consultar se o Pix foi pago
app.get('/api/status-pagamento/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: {
                'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`
            }
        });

        res.json({
            sucesso: true,
            status: response.data.status
        });
    } catch (error) {
        console.error('Erro ao verificar status:', error.response ? error.response.data : error.message);
        res.status(500).json({ sucesso: false, erro: 'Erro ao verificar status' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
