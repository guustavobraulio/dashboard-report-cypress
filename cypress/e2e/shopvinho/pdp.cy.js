import FechandoModalIdade from '../../support/commands.js'
import AcesanAcessandoPaginaProdutodo from '../../support/commands.js'
import locators from '../../support/locators.js';


describe('[Shopvinho] Validação da página de produto', () => {

    beforeEach(() => {
        cy.viewport(1920, 1080)
        cy.visit('https://www.shopvinho.com.br/')
        cy.FechandoModalIdade()
        cy.AcessandoPaginaProduto()
    });

    it('Verificando se possui o modal de imagens do produto principal', () => {
        cy.get(locators.shopvino_pdp.modalImagensProduto)
            .should('be.visible')
    });

    it('Aumentando a quantidade de produto', () => {

        cy.get(locators.shopvino_pdp.aumentandoQuantidade)
            .first()
            .dblclick()

        cy.get(locators.shopvino_pdp.quantidadeDeProdutos)
            .first()
            .should('have.value', '2')

        cy.get(locators.shopvino_pdp.btnAdicionarProduto)
            .click()

        cy.get(locators.shopvinho_home.modalCarrinho)
            .should('be.visible')

        cy.get(locators.shopvino_pdp.quantidadeProdutoCarrinho)
            .should('have.value', '1')

    });

    it('Diminuir a quantidade de produtos', () => {
        cy.get(locators.shopvino_pdp.aumentandoQuantidade)
            .last()
            .click()
            .wait(1000)
            .click()
            .click()

        cy.get(locators.shopvino_pdp.quantidadeDeProdutos)
            .first()
            .should('have.value', '4')

        cy.get(locators.shopvino_pdp.diminuirAQuantidadeDeProduto)
            .first()
            .click()

        cy.get(locators.shopvino_pdp.quantidadeDeProdutos)
            .first()
            .should('have.value', '3')
    });

    it('Validar se o produto possui div de especificação de produto ', () => {

        cy.get(locators.shopvino_pdp.especificacaoProduto)
            .should('be.visible')
    });

});