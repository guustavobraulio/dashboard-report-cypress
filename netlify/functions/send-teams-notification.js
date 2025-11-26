const axios = require('axios');

exports.handler = async (event, context) => {
  console.log('[teams] Iniciando execução...');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };

  try {
    const data = JSON.parse(event.body);
    console.log('[teams] Payload recebido. Total testes:', data.totalTests);

    const WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    if (!WEBHOOK_URL) {
      console.error('[teams] URL do Webhook não configurada!');
      throw new Error('URL do Webhook não configurada.');
    }

    // 1. TRATAMENTO DE DURAÇÃO
    let durationFormatted = "0s";
    try {
        const durationTotalSeconds = data.duration || 0;
        const minutes = Math.floor(durationTotalSeconds / 60);
        const seconds = Math.floor(durationTotalSeconds % 60);
        durationFormatted = `${seconds}s`;
        if (minutes > 0) {
            const hours = Math.floor(minutes / 60);
            if (hours > 0) {
                durationFormatted = `${hours}h ${minutes % 60}m ${seconds}s`;
            } else {
                durationFormatted = `${minutes}m ${seconds}s`;
            }
        }
    } catch (e) { console.error('[teams] Erro ao formatar duração:', e); }

    // 2. TRATAMENTO DE DATA (Versão sem Intl para máxima compatibilidade)
    let displayDate = "";
    try {
        if (data.formattedDate) {
            displayDate = data.formattedDate;
        } else {
            // Fallback seguro: gera data atual e subtrai 3h se for UTC
            const now = new Date();
            // Ajuste simples: converte para String com Timezone
            displayDate = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        }
    } catch (e) {
        console.error('[teams] Erro data:', e);
        displayDate = new Date().toISOString();
    }

    // 3. LISTA DE LOJAS
    let storesString = "Geral";
    try {
        const storesList = (data.stores && data.stores.length > 0) ? data.stores : [data.client || 'Projeto'];
        storesString = storesList.join(' • ');
    } catch (e) { console.error('[teams] Erro lojas:', e); }


    // DADOS GERAIS
    const stats = {
      total: data.totalTests || 0,
      passed: data.passedTests || 0,
      failed: data.failedTests || 0,
      skipped: data.skippedTests || 0,
      duration: durationFormatted,
      environment: data.environment || 'Produção',
      author: data.author || 'Sistema',
      client: data.client || 'Projeto',
      date: displayDate 
    };

    // CORES
    let headerStyle = "Good";
    let headerIcon = "✅";
    let headerText = "SUCESSO";

    if (stats.failed > 0) {
      headerStyle = "Attention";
      headerIcon = "❌";
      headerText = "FALHA";
    } else if (stats.skipped > 0 && stats.passed === 0) {
      headerStyle = "Warning";
      headerIcon = "⚠️";
      headerText = "ATENÇÃO";
    }

    // HELPER LISTAS
    const MAX_ERRORS_TO_SHOW = 40;
    const failedItems = [];
    try {
        const rawList = (data.failedList || []).slice(0, MAX_ERRORS_TO_SHOW);
        rawList.forEach(test => {
            const fullTitle = test.title || test;
            const parts = typeof fullTitle === 'string' ? fullTitle.split(' > ') : [String(fullTitle)];
            const testName = parts.length > 1 ? parts[parts.length - 1] : fullTitle;
            const suiteName = parts.length > 1 ? parts.slice(0, -1).join(' > ') : 'Teste Geral';

            failedItems.push({
              type: "Container",
              spacing: "Small",
              items: [
                  { type: "TextBlock", text: `🔴 ${testName}`, wrap: true, weight: "Bolder", size: "Small", color: "Attention" },
                  { type: "TextBlock", text: `[${stats.client}] ${suiteName}`, wrap: true, isSubtle: true, size: "Small", spacing: "None" }
              ]
            });
        });

        if ((data.failedList || []).length > MAX_ERRORS_TO_SHOW) {
            failedItems.push({
                 type: "TextBlock",
                 text: `... e mais ${(data.failedList.length - MAX_ERRORS_TO_SHOW)} erros não listados.`,
                 isSubtle: true, italic: true, size: "Small", horizontalAlignment: "Center"
            });
        }
    } catch (e) { console.error('[teams] Erro lista falhas:', e); }

    // CARD
    const adaptiveCard = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      msteams: { width: "Full" },
      body: [
        // Cabeçalho
        {
          type: "Container",
          style: headerStyle,
          items: [
            {
              type: "ColumnSet",
              columns: [
                { type: "Column", width: "auto", items: [{ type: "TextBlock", text: headerIcon, size: "Large" }] },
                {
                  type: "Column", width: "stretch", verticalAxisAlignment: "Center",
                  items: [
                    { type: "TextBlock", text: `${stats.client} - ${headerText}`, weight: "Bolder", size: "Medium", color: "Light", wrap: true },
                    { type: "TextBlock", text: `Ambiente: ${stats.environment} | Autor: ${stats.author} | 📅 ${stats.date}`, size: "Small", color: "Light", isSubtle: true, wrap: true, spacing: "None" }
                  ]
                }
              ]
            }
          ],
          bleed: true
        },
        // Dashboard
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ColumnSet",
              columns: [
                { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: "⏱️ Tempo", isSubtle: true, size: "Small", horizontalAlignment: "Center" }, { type: "TextBlock", text: stats.duration, weight: "Bolder", size: "Large", horizontalAlignment: "Center" }] },
                { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: "Total", isSubtle: true, size: "Small", horizontalAlignment: "Center" }, { type: "TextBlock", text: stats.total.toString(), weight: "Bolder", size: "Large", horizontalAlignment: "Center" }] },
                { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: "Passou", color: "Good", size: "Small", horizontalAlignment: "Center" }, { type: "TextBlock", text: stats.passed.toString(), color: "Good", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }] },
                { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: "Falhou", color: "Attention", size: "Small", horizontalAlignment: "Center" }, { type: "TextBlock", text: stats.failed.toString(), color: "Attention", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }] },
                { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: "Ignorados", color: "Warning", size: "Small", horizontalAlignment: "Center" }, { type: "TextBlock", text: stats.skipped.toString(), color: "Warning", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }] }
              ]
            }
          ]
        },
        // Lojas
        {
            type: "Container",
            spacing: "Small",
            items: [
                {
                    type: "TextBlock",
                    text: `🏪 Lojas: ${storesString}`, 
                    wrap: true, size: "Small", color: "Accent", weight: "Bolder", horizontalAlignment: "Center"
                }
            ]
        },
        // Separador
        { type: "Container", items: [], style: "default", bleed: true, height: "1px", separator: true },
        // Erros
        ...(failedItems.length > 0 ? [
            {
                type: "Container",
                spacing: "Medium",
                items: [
                    { type: "TextBlock", text: `📋 Detalhes dos Erros (${stats.failed})`, weight: "Bolder", size: "Medium", spacing: "Medium" },
                    ...failedItems
                ]
            }
        ] : [])
      ],
      actions: [
        { type: "Action.OpenUrl", title: "🔍 Ver Relatório Detalhado", url: data.socialPanelUrl || "https://google.com", style: "positive" }
      ]
    };

    const payload = {
      type: "message",
      attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: adaptiveCard }]
    };

    console.log(`[teams] Enviando payload (${JSON.stringify(payload).length} bytes)...`);
    
    const response = await axios.post(WEBHOOK_URL, payload, { 
        headers: { 'Content-Type': 'application/json' }, 
        timeout: 20000 
    });

    console.log('[teams] Sucesso! Status:', response.status);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (error) {
    console.error('[teams] ERRO FATAL:', error.message);
    if (error.response) {
         console.error('[teams] Detalhes:', JSON.stringify(error.response.data));
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
