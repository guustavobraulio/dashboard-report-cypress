import AcessandoPaginaProduto_Jasmine from "../../support/commands.js"
import AdicionandoProdutoNoCarrinho_Jasmine from "../../support/commands.js"
import AumentandoQuantidadeProduto_Jasmine from "../../support/commands.js"

describe('Validação da página de produto', () => {
    
    beforeEach(() => {

        cy.AcessandoPaginaProduto_Jasmine()
    
    })
    
    it('Validar se a página possui bredcrumb', () => {
        
        cy.get('[class="flex lg:max-w-[940px] lg:mx-auto w-full sm-tablet:hidden sm-laptop:flex"]')
            .should('be.visible')

    });

    it('Adicionando produto no carrinho', () => {
        
        cy.get('[class="max-w-full flex-row w-full flex-1 flex p-0 items-center justify-center rounded bg-green-300 gap-2.5 hover:bg-green-300 btn btn-primary no-animation"]')
            .click()

        cy.get('[class="cy-minicart-counter indicator-item top-2 badge font-bold bg-primary text-white size-[18px] rounded-full border-none text-xs"]')
            .should('be.visible')
            .should('have.text', '01')

        cy.get('[class="cy-minicart-button indicator flex justify-end items-center w-16 sm-laptop:w-auto"]')
            .click()

        cy.get('[class="cy-aside bg-white flex flex-col h-full"]')
            .should('be.visible')
        
        cy.get('[class="cy-minicart-item grid grid-rows-1 gap-2"]')
            .should('be.visible')

        cy.get('[class="cy-minicart-item-counter outline-none text-2xl leading-6 w-6 text-center"]')
            .first()
            .should('be.visible')
            .should('have.value', '1')
    });

    it('Removendo produto do carrinho e verificando se ele fica vazio', () => {
        
        cy.AdicionandoProdutoNoCarrinho_Jasmine()

        cy.get('[class="cy-minicart-item-remove btn btn-ghost btn-square no-animation flex flex-col gap-1.5 justify-start items-center"]')
            .click()

        cy.get('[class="cy-empty-cart-title font-medium text-2xl text-primary text-center "]')
            .should('be.visible')
            .should('have.text', 'Seu carrinho está vazio')
    });

    it('Validar se o produto possui Descrição', () => {
        
        cy.get('[class="mt-14 sm-tablet:mx-auto sm-tablet:mb-6 sm-tablet:py-6 sm-tablet:max-w-[985px] sm-tablet:w-full border-b border-t sm-tablet:border-solid pt-6 border-white-400 mx-3 "]')
            .should('be.visible')   

        cy.get('[class="cy-description-pdp sm-tablet:px-3 text-base/4 max-w-[660px] mx-auto text-left lg:px-0 sm-tablet:text-base/5"]')
            .should('be.visible')
    });

    it('Validando o slide da vitrine de produtos', () => {
        
        cy.scrollTo('bottom')

        cy.get('[class="disabled:hidden"]')
            .should('be.visible')
            .last()
            .click()
            .wait(1000)
            .dblclick()
    });

    it('Aumentando a quantidade de produtos', () => {
        
        cy.wait(1500)

        cy.get('[class="cy-minicart-item-counter-plus btn btn-square btn-ghost no-animation min-h-7 h-7 w-8"]')
            .first()
            .dblclick()
            .wait(1000)
            .dblclick()
        cy.get('[class="cy-minicart-item-counter outline-none text-2xl leading-6 w-6 text-center"]')
            .first()
            .should('be.visible')
            .should('have.value', '4')


        cy.get('[class="max-w-full flex-row w-full flex-1 flex p-0 items-center justify-center rounded bg-green-300 gap-2.5 hover:bg-green-300 btn btn-primary no-animation"]')
            .should('be.visible')
            .click()

        cy.get('[class="cy-minicart-icon btn btn-square btn-sm btn-ghost no-animation w-9 h-9"]')
            .click()

        cy.get('[class="pb-4 border-b border-solid border-gray-100 last-of-type:border-b-0"]')
            .should('be.visible')
    });
}); 