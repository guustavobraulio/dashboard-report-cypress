Cypress.commands.add('FechandoModalIdade', () => {

    cy.viewport(1920, 1080)
    cy.visit('https://www.shopvinho.com.br/')


    cy.get('[class="modal-box w-[300px] h-fit border border-[#de1d49]"]')
        .should('be.visible')

    cy.get('[class="px-2.5 py-1 text-white text-15 bg-red-600 rounded-5"]')
        .click()

})


