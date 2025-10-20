import './commands'

Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignora todos os erros não capturados
  return false
}

)
Cypress.URLS = {
  // Easy Commerce URLs
  easyCommerce_departamento: 'https://easycommerce.deco.site/ft---alimentacao?page=1',
  easyCommerce_departamento_ordenarPorMenorPreco: 'https://easycommerce.deco.site/ft---alimentacao?sort=price%3Aasc',
  easyCommerce_home: 'https://easycommerce.deco.site/',
  easyCommerce_pdp: 'https://easycommerce.deco.site/fio-de-sutura-seda-preta-trancada-75cm-2-0-ag-60mm-623h_pai/p?skuId=341968',

  // Jasmine URLs 
  jasmine_home: 'https://www.loja.jasminealimentos.com',



  shopmulti: 'https://shopmulti.com.br'
}


Cypress.VIEWPORT = {
  desktop: { width: 1920, height: 1080 },
}