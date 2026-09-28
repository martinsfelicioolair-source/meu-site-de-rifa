
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Tenta pegar a chave cadastrada nas variáveis de ambiente do Render
const ASAAS_API_KEY = (process.env.ASAAS_API_KEY || process.env.MERCADO_PAGO_TOKEN || '').trim();

// Se a sua conta no Asaas for Sandbox (testes), mude a URL abaixo para:
// const ASAAS_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_URL = 'https://www.asaas.com/api/v3';

app.post('/api/criar-pix', async (req, res) => {
    try {
        const { valor, descricao, email, nome, cpf, telefone } = req.body;

        // Verifica se a chave existe antes de chamar a API
        if (!ASAAS_API_KEY) {
            return res.status(400).json({ 
                sucesso: false, 
                erro: 'Nenhuma chave de API configurada no Render (ASAAS_API_KEY).' 
            });
        }

        // 1. Criar cliente no Asaas
        const customerResponse = await axios.post(`${ASAAS_URL}/customers`, {
            name: nome,
            cpfCnpj: cpf,
            email: email,
            phone: telefone
        }, {
            headers: { 
                'access_token': ASAAS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const customerId = customerResponse.data.id;

        // 2. Criar cobrança Pix
        const paymentResponse = await axios.post(`${ASAAS_URL}/payments`, {
            customer: customerId,
            billingType: 'PIX',
            value: Number(valor),
            dueDate: new Date().toISOString().split('T')[0],
            description: descricao || 'Compra de Cotas - Rifa'
        }, {
            headers: { 
                'access_token': ASAAS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const paymentId = paymentResponse.data.id;

        // 3. Buscar QR Code Pix
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
        const mensagemErro = error.response?.data?.errors?.[0]?.description 
            || (error.response?.status === 401 ? 'Chave de API do Asaas recusada (401). Verifique o token ou se a conta é Sandbox.' : error.message);

        console.error('Erro na API Asaas:', error.response?.data || error.message);
        res.status(500).json({ sucesso: false, erro: mensagemErro });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
