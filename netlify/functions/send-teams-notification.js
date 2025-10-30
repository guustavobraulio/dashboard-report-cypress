// 🔥 N8N Function Node - Monta MessageCard com cores dinâmicas

const data = $input.first().json;

// 📊 Array de facts (campos informativos)
const facts = [
  {
    name: '📊 Total de Testes',
    value: data.totalTests.toString()
  },
  {
    name: '✅ Testes Aprovados',
    value: `${data.passedTests} (${((data.passedTests / data.totalTests) * 100).toFixed(1)}%)`
  }
];

// 🔥 SÓ ADICIONA A LINHA VERMELHA SE HOUVER FALHAS
if (data.failedTests > 0) {
  facts.push({
    name: '❌ Testes Reprovados',
    value: data.failedTests.toString()
  });
}

// 🔥 SEMPRE MOSTRA IGNORADOS
facts.push({
  name: '⏭️ Ignorados/Pendentes',
  value: data.skippedTests.toString()
});

facts.push({
  name: '⏱️ Duração',
  value: `${data.duration}s`
});

facts.push({
  name: '👤 Executado por',
  value: data.author
});

facts.push({
  name: '📅 Data/Hora',
  value: new Date(data.timestamp).toLocaleString('pt-BR')
});

// 🎨 COR DINÂMICA: Vermelho se falhas, Verde se OK
const themeColor = data.failedTests > 0 ? "ff0000" : "00aa00";

// 🎨 CARD PRINCIPAL COM MELHOR LAYOUT
const messageCard = {
  "@type": "MessageCard",
  "@context": "https://schema.org/extensions",
  "summary": `Relatório de Testes - ${data.client}`,
  "themeColor": themeColor,
  "title": "⚠️ Relatório de Testes",
  "sections": [
    {
      "activityTitle": `${data.client} - ${data.branch} | ${data.environment}`,
      "activitySubtitle": `Branch: ${data.branch} | Ambiente: ${data.environment}`,
      "facts": facts,
      "markdown": true
    }
  ],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "📈 Ver Dashboard Completo",
      "targets": [
        {
          "os": "default",
          "uri": `${data.socialPanelUrl}?client=${data.client}&branch=${data.branch}`
        }
      ]
    }
  ]
};

// 🔥 SE HOUVER TESTES REPROVADOS, ADICIONA SEÇÃO SEPARADA COM LISTA
if (data.failedList && data.failedList.length > 0) {
  messageCard.sections.push({
    "activityTitle": "❌ Testes que Falharam",
    "text": data.failedList
      .slice(0, 15)
      .map((test, i) => `${i + 1}. ${test}`)
      .join("\n\n"),
    "markdown": true
  });
}

// 🔥 SE HOUVER TESTES IGNORADOS E LISTA, ADICIONA SEÇÃO
if (data.skippedList && data.skippedList.length > 0) {
  messageCard.sections.push({
    "activityTitle": "⏭️ Testes Ignorados/Pendentes",
    "text": data.skippedList
      .slice(0, 10)
      .map((test, i) => `${i + 1}. ${test}`)
      .join("\n\n"),
    "markdown": true
  });
}

return { messageCard };
