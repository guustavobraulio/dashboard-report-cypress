import FechandoModalIdade from '../../support/commands.js'


describe('[Shop Vinho] Validação da página home', () => {
    
    beforeEach(() => {
        cy.viewport(1920, 1080)
        cy.visit('https://www.shopvinho.com.br/');
    });
    
    it('Fechando o modal de idade', () => {
        
        cy.get('[class="modal-box w-[300px] h-fit border border-[#de1d49]"]')
            .should('be.visible')

        cy.get('[class="px-2.5 py-1 text-white text-15 bg-red-600 rounded-5"]')
            .click()
    });

    it('Adicionando produto no carrinho', () => {
        
        cy.FechandoModalIdade()

        cy.url()
            .should('include', 'https://www.shopvinho.com.br')

        cy.scrollTo(0, 500)

        cy.get('[class="transaction-colors duration-75 bg-complementary-1 active:bg-complementary-1-dark rounded-tl-10 rounded-bl-md rounded-br-10 flex items-center justify-center w-31/2 h-21/2"]')
            .first()
            .should('be.visible')
            .click()    

    });
});