describe('Validação da Home page - Victor Hugo', () => {
    
    beforeEach(() => {

        cy.viewport(1920, 1080);
        cy.intercept('**/google-analytics.com/**', { statusCode: 204 });
        cy.visit('https://www.victorhugo.com.br/', {setTimeout: 100000});

    });
    
    it('Validando categorias "Presentes" do header ', () => {
        
        cy.url()
            .should('include','https://www.victorhugo.com.brr')

        cy.get('#headlessui-popover-button-7')
            .should('be.visible')
            .click()

        cy.get('[class="grid py-16 grid-cols-2 gap-y-10 gap-x-8"]')
            .should('be.visible')
            
        cy.contains('Luxury')   
            .click()
            
        cy.url()
            .should('include','https://www.victorhugo.com.br/colecao/luxury')
    });

    it('Validando o direcionamento do SHOP NOW', () => {
        
        cy.url()
            .should('include','https://www.victorhugo.com.br')

        cy.get('[class="z-10 border px-8 py-2.5 text-xs md:max-w-md transition-colors duration-500 ease-in-out border-black hover:bg-black hover:text-white hover:border-white"]')
            .should('be.visible')
            .eq(1)
            .click()        

    });

});