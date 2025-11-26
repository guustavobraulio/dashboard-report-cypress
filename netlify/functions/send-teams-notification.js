const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };

  try {
    const data = JSON.parse(event.body);
    const WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

    if (!WEBHOOK_URL) throw new Error('URL do Webhook não configurada.');

    // 1. DADOS
    const stats = {
      total: data.totalTests || 0,
      passed: data.passedTests || 0,
      failed: data.failedTests || 0,
      skipped: data.skippedTests || 0,
      duration: ((data.duration || 0) / 1000).toFixed(1) + "s",
      environment: data.environment || 'Produção',
      author: data.author || 'Sistema',
      client: data.client || 'Projeto',
      // Adicionando Data que faltava no seu código
      date: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
    };

    // 2. CORES
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

    // 3. HELPER PARA LISTAS (Com limite de segurança!)
    const MAX_ERRORS_TO_SHOW = 40; // Limite seguro para evitar erro de envio
    
    const createErrorList = (list) => {
      // Proteção: Pega no máximo 40 itens
      const safeList = (list || []).slice(0, MAX_ERRORS_TO_SHOW);
      
      return safeList.map(test => {
        const fullTitle = test.title || test;
        const parts = typeof fullTitle === 'string' ? fullTitle.split(' > ') : [fullTitle];
        const testName = parts.length > 1 ? parts[parts.length - 1] : fullTitle;
        const suiteName = parts.length > 1 ? parts.slice(0, -1).join(' > ') : 'Teste Geral';

        return {
          type: "Container",
          spacing: "Small",
          items: [
              { type: "TextBlock", text: `🔴 ${testName}`, wrap: true, weight: "Bolder", size: "Small", color: "Attention" },
              { type: "TextBlock", text: `[${stats.client}] ${suiteName}`, wrap: true, isSubtle: true, size: "Small", spacing: "None" }
          ]
        };
      });
    };

    const failedItems = createErrorList(data.failedList);

    // Se cortou itens, adiciona aviso no final
    if ((data.failedList || []).length > MAX_ERRORS_TO_SHOW) {
        failedItems.push({
             type: "TextBlock",
             text: `... e mais ${(data.failedList.length - MAX_ERRORS_TO_SHOW)} erros não listados.`,
             isSubtle: true,
             italic: true,
             size: "Small",
             horizontalAlignment: "Center"
        });
    }

    // 4. ADAPTIVE CARD
    const adaptiveCard = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      msteams: { width: "Full" },
      body: [
        // CABEÇALHO
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
        // DASHBOARD
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
                 // Adicionando Coluna Ignorados que faltava no seu código
                { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: "Ignorados", color: "Warning", size: "Small", horizontalAlignment: "Center" }, { type: "TextBlock", text: stats.skipped.toString(), color: "Warning", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }] }
              ]
            }
          ]
        },
        // LISTA DE ERROS
        ...(failedItems.length > 0 ? [
            {
                type: "Container",
                spacing: "Medium",
                separator: true, // Linha separadora importante
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
        timeout: 15000 // Timeout aumentado
    });
    
    console.log('[teams] Sucesso:', response.status);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (error) {
    // Log detalhado para você ver o erro real no console da AWS/Lambda
    console.error('[teams] ERRO FATAL:', error.message);
    if (error.response) {
        console.error('[teams] Status:', error.response.status);
        console.error('[teams] Data:', JSON.stringify(error.response.data));
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
