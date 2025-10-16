import './commands'

Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignora todos os erros não capturados
  return false
})