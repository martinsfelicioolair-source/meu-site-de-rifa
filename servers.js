const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const ASAAS_API_KEY = process.env.MERCADO_PAGO_TOKEN || process.env.ASAAS_API_KEY;
const ASAAS_URL = 'https://www.asaas.com/api/v3';

app.post('/api/criar-pix', async (req, res) => {
    try {
        const { valor, descricao, email, nome, cpf, telefone } = req.body;

        // 1. Criar o cliente no Asaas (Exige CPF válido)
        const customerResponse = await axios.post(`${ASAAS_URL}/customers`, {
            name: nome,
            cpfCnpj: cpf,
            email: email,
            phone: telefone
        }, {
            headers: { 'access_token': ASAAS_API_KEY }
        });

        const customerId = customerResponse.data.id;

        // 2. Criar a cobrança Pix
        const paymentResponse = await axios.post(`${ASAAS_URL}/payments`, {
            customer: customerId,
            billingType: 'PIX',
            value: Number(valor),
            dueDate: new Date().toISOString().split('T')[0],
            description: descricao || 'Compra de Cotas - Rifa'
        }, {
            headers: { 'access_token': ASAAS_API_KEY }
        });

        const paymentId = paymentResponse.data.id;

        // 3. Buscar QR Code e o código Pix
        const qrCodeResponse = await axios.get(`${ASAAS_URL}/payments/${paymentId}/pixQrCode`, {
            headers: { 'access_token': ASAAS_API_KEY }
        });

        res.json({
            sucesso: true,
            idPagamento: paymentId,
            qrCode: qrCodeResponse.data.payload,
            qrCodeBase64: qrCodeResponse.data.encodedImage
        });

    } catch (error) {
        const detalheErro = error.response?.data?.errors?.[0]?.description || error.message;
        console.error('Erro Asaas:', error.response?.data || error.message);
        res.status(500).json({ sucesso: false, erro: detalheErro });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
