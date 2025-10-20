import locators from "../../support/locators.js";

describe('[Easy Commerce]Validação da página de departamento', () => {

    beforeEach(() => {
        cy.viewport(Cypress.VIEWPORT.desktop.width, Cypress.VIEWPORT.desktop.height);
        cy.visit(Cypress.URLS.easyCommerce_departamento);
    });

    it('Validar se a página de departamento possui breadcrumb', () => {
        cy.get(locators.easyCommerce_departamento.breadcrumb)
            .should('be.visible');
    });

    it('Validar se a página possui título e SEO', () => {

        cy.get(locators.easyCommerce_departamento.tituloSEO)
            .should('be.visible')

        cy.get(locators.easyCommerce_departamento.textoSEO)
            .should('be.visible')
    });

    it('Validar a funcionalidade de Ordenar Por', () => {

        cy.get(locators.easyCommerce_departamento.ordenarPorMenorPreco)
            .last()
            .click()
    });
});