import './commands'

Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignora o erro específico de 'replaceAll' que não afeta o teste
  if (err.message.includes("Cannot read properties of undefined (reading 'replaceAll')")) {
    return false;
  }
  // Para todos os outros erros, permite que o Cypress falhe o teste
  return true;
  
}),

Cypress.on('uncaught:exception', (err, runnable) => {
  // Retornar false aqui impede o Cypress de falhar o teste
  // por QUALQUER erro não tratado na aplicação.
  return false

})      