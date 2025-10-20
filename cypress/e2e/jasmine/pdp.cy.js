import AcessandoPaginaProduto_Jasmine from "../../support/commands.js"
import AdicionandoProdutoNoCarrinho_Jasmine from "../../support/commands.js"
import AumentandoQuantidadeProduto_Jasmine from "../../support/commands.js"
import locators from "../../support/locators";

describe('Validação da página de produto', () => {
    
    beforeEach(() => {
        cy.AcessandoPaginaProduto_Jasmine()
    })
    
    it('Validar se a página possui bredcrumb', () => {
        
        cy.get(locators.jasmine_pdp.breadcrumbPDP)
            .should('be.visible')

    });

    it('Adicionando produto no carrinho', () => {
        
        cy.get(locators.jasmine_home.btnAdicionaroCarrinhoPDP)
            .click()

        cy.get(locators.jasmine_home.valorProdutosNoCarrinho)
            .should('be.visible')
            .should('have.text', '01')

        cy.get(locators.jasmine_pdp.iconeMiniCart)
            .click()

        cy.get(locators.jasmine_pdp.modalMiniCart)
            .should('be.visible')
        
        cy.get(locators.jasmine_pdp.componenteProdutoIndividual)
            .should('be.visible')

        cy.get(locators.jasmine_pdp.quantidadeValue)
            .first()
            .should('be.visible')
            .should('have.value', '1')
    });

    it('Removendo produto do carrinho e verificando se ele fica vazio', () => {
        
        cy.AdicionandoProdutoNoCarrinho_Jasmine()

        cy.get(locators.jasmine_pdp.removerProdutoMinicart)
            .click()

        cy.get(locators.jasmine_pdp.textoCarrinhoVazio)
            .should('be.visible')
            .should('have.text', 'Seu carrinho está vazio')
    });

    it('Validar se o produto possui Descrição', () => {
        
        cy.get(locators.jasmine_pdp.modalDescriçãoProduto)
            .should('be.visible')   

        cy.get(locators.jasmine_pdp.modalDescriçãoProduto)
            .should('be.visible')
    });

    it('Validando o slide da vitrine de produtos', () => {
        
        cy.scrollTo('bottom')

        cy.get(locators.jasmine_pdp.slideVitrine)
            .should('be.visible')
            .last()
            .click()
            .wait(1000)
            .dblclick()
    });

    it('Aumentando a quantidade de produtos', () => {
        
        cy.wait(1500)

        cy.get(locators.jasmine_pdp.aumentarQuantidadeDeProduto)
            .first()
            .dblclick()
            .wait(1000)
            .dblclick()
        cy.get(locators.jasmine_pdp.quantidadeValue)
            .first()
            .should('be.visible')
            .should('have.value', '4')


        cy.get(locators.jasmine_home.btnAdicionaroCarrinhoPDP)
            .should('be.visible')
            .click()

        cy.get(locators.jasmine_home.header.iconMinicart)
            .click()

        cy.get(locators.jasmine_home.modalProdutoNoCarrinho)
            .should('be.visible')
    });
}); 