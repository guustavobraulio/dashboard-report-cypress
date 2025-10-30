import FechandoModalIdade from '../../support/commands.js'
import locators from '../../support/locators.js';

describe('[ShopVinho] Validação da página home', () => {
    
    let email = 'teste@qa.com.br'

    beforeEach(() => {
        cy.viewport(1920, 1080)
        cy.visit('https://www.shopvinho.com.br/');
    });
    
    it('Fechando o modal de idade', () => {
        cy.get(locators.shopvinho_home.modalIdade)
            .should('be.visible')

        cy.get(locators.shopvinho_home.fechandoModalIdade)
            .click()
    });

    it('Adicionando produto no carrinho', () => {
        cy.FechandoModalIdade()

        cy.url()
            .should('include', 'https://www.shopvinho.com.br')

        cy.scrollTo(0, 500)

        cy.get(locators.shopvinho_home.btnAdicionarAoCarrinho)
            .first()
            .should('be.visible')
            .click()    
    });

    it('Validar se a página home possui os infocards', () => {        
        cy.FechandoModalIdade()
        
        cy.get(locators.shopvinho_home.infoCards)
            .should('be.visible')
    });

    it('Validar a aba de Categorias', () => {
        cy.FechandoModalIdade()

        cy.get(locators.shopvinho_home.abaCategorias)
            .first()
            .should('be.visible')
            .should('contain.text', 'Categorias')

        cy.get(locators.shopvinho_home.tiposCategorias)
            .should('be.visible')
    });

    it('Clicando em adicionar produto no carrinho', () => {
        cy.FechandoModalIdade()
        cy.scrollTo(0, 300)

        cy.get(locators.shopvinho_home.btnAdicionarAoCarrinho)
            .first()
            .should('be.visible')
            .click()

        cy.get(locators.shopvinho_home.modalCarrinho)
            .should('be.visible', {timeout: 10000})

        cy.get(locators.shopvinho_home.modalProdutoNoCarrinho)
            .should('be.visible')
    });

    it('Validar banners', () => {
        cy.FechandoModalIdade()

        cy.scrollTo(0, 2000)

        cy.get(locators.shopvinho_home.tiposCategorias)
            .should('be.visible')
            .should('length', 2)
    });

    it('Validar o envio da newsletter', () => {
        cy.FechandoModalIdade()

        cy.scrollTo('bottom')

        cy.get(locators.shopvinho_home.newsletter.inputEmail)
            .type(email)

        cy.get(locators.shopvinho_home.newsletter.checkPrivacidade)
            .click()

        cy.get(locators.shopvinho_home.newsletter.btnEnviar)
            .click()

        cy.contains(locators.shopvinho_home.newsletter.txtSucesso)
            .should('be.visible')
    });

    it('Validar se dentro do footer possui a logo da Social', () => {
        cy.FechandoModalIdade()
        cy.scrollTo('bottom')

        cy.wait(2000)

        cy.get(locators.shopvinho_home.logosFooter)
            .should('be.visible')
            .should('length', 2)
    });

    it('Entrando na página de produto', () => {
        
        cy.FechandoModalIdade()

        cy.scrollTo(0, 500)

        cy.get(locators.shopvinho_home.imgProduto)
            .first()
            .should('be.visible')
            .click()

        cy.get(locators.shopvinho_home.breadcrumbPDP, {timeout: 10000})
            .should('be.visible')
    });


});