
import AcessandoProduto from "../../support/commands"
import locators from "../../support/locators.js"

describe('Validação da página departamento', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080)
        cy.visit('https://www.shopvinho.com.br/')
        cy.FechandoModalIdade()
    });

    it('Acessando a página de departamento - Vinhos', () => {

        cy.get(locators.shopvinho_departamento.categVinhos)
            .first()
            .click()

        cy.url()
            .should('include', '/vinhos')
    });

    it('Validar se trás a quantidade de produtos dentro do departamento', () => {
        
        cy.AcessandoDepartamento()

        cy.get(locators.shopvinho_departamento.txtProdutosEncontrados)
            .should('be.visible')
    });

    it('Validar o filtro de Filtrar Por', () => {
        
        cy.AcessandoDepartamento()

        cy.contains('Mais vendidos')
            .click()

        cy.url()
        .should('include', '/vinhos?sort=orders%3Adesc')
    });

    it('Acessando a segunda parte da página', () => {
        
        cy.AcessandoDepartamento()

        cy.scrollTo('bottom')
        
        cy.get(locators.shopvinho_departamento.verMais)
            .last()
            .click()

        cy.url()
            .should('include', '/vinhos?page=2')
    });

    it('Validar se a página de departamento possui o breadcrumb', () => {
        
        cy.AcessandoDepartamento()

        cy.get(locators.shopvinho_departamento.breadcrumb)
            .should('be.visible')

    });
});