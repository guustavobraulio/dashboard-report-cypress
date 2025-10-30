import AcessandoDepartamento_Jasmine from "../../support/commands.js"
import locators from "../../support/locators.js";

describe('[Jasmine] Validação da Página de Departamento', () => {
    
    beforeEach(() => {
        cy.AcessandoDepartamento_Jasmine()
    });
    
    it('Acessando a página de departamento - Granolas', () => {
    
        cy.url()
            .should('include','/granolas?page=1')

        cy.get(locators.jasmine_departamento.breadcrumb)
            .should('be.visible')
    });

    it('Validar a funcionalidade Filtrar Por', () => {
        
        cy.contains('Menores Preços')
            .should('be.visible')
            .click()
            
        cy.url()
            .should('include','/granolas?sort=PRICE%3AASC&page=1')
    });

    it('Clicando no botão de Ver Mais', () => {

        cy.scrollTo('bottom')

        cy.wait(1500)

        cy.get(locators.jasmine_departamento.btnVerMais)
            .should('be.visible')
            .click()

        cy.url()
            .should('include','/granolas?page=2')
    });

    it('Validação do footer dentro da página departamento', () => {
        
        cy.scrollTo('bottom')

        cy.get(locators.jasmine_departamento.modalFooter)
            .should('be.visible')

        cy.get(locators.jasmine_departamento.logoSocial)
            .should('be.visible')
            .should('have.attr','alt','Social S.A.')



    });
});