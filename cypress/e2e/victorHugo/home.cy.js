describe('[Victor Hugo] Validação da Home page', function () {

    beforeEach(function () {
        cy.viewport(1920, 1080);
        cy.intercept('**/google-analytics.com/**', { statusCode: 204 });
        cy.visit('https://www.victorhugo.com.br/', { setTimeout: 100000 });

    });

    it('Validando categorias "Presentes" do header ', function () {
        cy.url()
            .should('include', 'https://www.victorhugo.com.br')

        cy.get('#headlessui-popover-button-7')
            .should('be.visible')
            .click()

        cy.get('[class="grid py-16 grid-cols-2 gap-y-10 gap-x-8"]')
            .should('be.visible')

        cy.contains('Luxury')
            .click()

        cy.url()
            .should('include', 'https://www.victorhugo.com.br/colecao/luxury')
    });
});