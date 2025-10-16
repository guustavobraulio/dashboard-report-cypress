import AcessandoDepartamento_Jasmine from "../../support/commands.js"

describe('Validação da Página de Departamento', () => {
    
    beforeEach(() => {
        cy.AcessandoDepartamento_Jasmine()
    });
    
    it('Acessando a página de departamento - Granolas', () => {
        

        cy.url()
            .should('include','/granolas?page=1')

        cy.get('[class="max-w-fit bg-black/25 backdrop-blur pr-2.5 py-1.5 rounded ml-6 sm-tablet:ml-0"]')
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

        cy.get('[class="mx-auto sm:max-w-[343px] btn btn-ghost h-10 min-h-fit w-full rounded bg-primary font-medium text-white text-base/tight hover:bg-primary hover:border-none"]')
            .should('be.visible')
            .click()

        cy.url()
            .should('include','/granolas?page=2')
    });

    it('Validação do footer dentro da página departamento', () => {
        
        cy.scrollTo('bottom')

        cy.get('[class="cy-footer bg-primary pl-5 pt-1.5 pr-2 pb-3.5 rounded-t-lg sm:py-10 sm:px-0"]')
            .should('be.visible')

        cy.get('[class="cy-footer-managed-by-icon"]')
            .should('be.visible')
            .should('have.attr','alt','Social S.A.')



    });
});