import FechandoModalIdade from '../../support/commands.js'
import AcesanAcessandoPaginaProdutodo from '../../support/commands.js'


describe('[ShopVinho]Validação da página de produto', () => {
    
    beforeEach(() => {
        cy.viewport(1920, 1080)
        cy.visit('https://www.shopvinho.com.br/')
        cy.FechandoModalIdade()
        cy.AcessandoPaginaProduto()
    });

    it('Verificando se possui o modal de imagens do produto principal', () => {
        cy.get('[class="flex justify-center sm:justify-start gap-x-3.5 items-center sm:mt-5 lg:mt-0 lg:mr-5 lg:order-1 lg:flex-col"]')
            .should('be.visible')
    });

    it('Aumentando a quantidade de produto', () => {
        
        cy.get('.quantity > :nth-child(3)')
            .first()
            .dblclick()

        cy.get('[value="1"]')
            .first()
            .should('have.value', '2')

        cy.get('[class="text-lg sm:text-base font-medium py-2.5 sm:py-0 sm:h-12 flex justify-center items-center rounded-5 sm:rounded-l-none sm:rounded-r-10 border-[#21BC72] bg-[#21BC72] w-full leading-none text-white"]')
            .click()

        cy.get('[class="fixed top-0 w-full right-0 h-full md:w-[475px] flex flex-col bg-white rounded-10 overflow-y-auto"]')
            .should('be.visible')

        cy.get('[class="text-center bg-transparent text-xl font-medium max-w-[30px]"]')
            .should('have.value', '2')

    });

    it('Diminuir a quantidade de produtos', () => {
        cy.get('.quantity > :nth-child(3)')
            .last()
            .click()
            .wait(1000)
            .click()
            .click()

        cy.get('[value="1"]')
            .first()
            .should('have.value', '4')

        cy.get('[class="text-3xl font-light px-4 h-9 sm:h-12"]')
            .first()
            .click()
            
        cy.get('[value="1"]')
            .first()
            .should('have.value', '3')
    });

    it('Validar se o produto possui div de especificação de produto ', () => {
        
        cy.get('[class="text-xl text-[#8e8e93] flex items-center justify-between mb-4"]')
            .should('be.visible')
            .should('contain.text', 'Sobre o produto')
    });

});