import locators from "../../support/locators";

describe('[JASMINE] Validação da página home Jasmine', () => {
    beforeEach(() => {
        cy.viewport(Cypress.VIEWPORT.desktop.width, Cypress.VIEWPORT.desktop.height)
        cy.visit(Cypress.URLS.jasmine_home)
    });

    let produto = 'granolas'
    let minicartVazio = 'Seu carrinho está vazio'

    it('Validar se as categorias estão disponíveis no header', () => {
        
        cy.get(locators.jasmine_home.header.categorias)
            .first()
            .should('be.visible')

        cy.get(locators.jasmine_home.header.modalCategorias)
            .should('have.length', 3)

    });

    it('Pequisando por algum produto', () => {
        
        cy.get(locators.jasmine_home.header.campoBuscar)
            .click()

        cy.get(locators.jasmine_home.header.inputBuscar)
            .type(produto)
            .wait(1500)
            .type('{enter}')

        cy.url()
            .should('include','/busca?busca=granolas&page=1')
    });

    it('Validar o minicart vazio ', () => {

        cy.get(locators.jasmine_home.header.iconMinicart)
            .click()
        
        cy.get(locators.jasmine_home.header.modalMinicart)
            .wait(1500)
            .should('be.visible')
            .and('contain.text', minicartVazio)

        cy.get(locators.jasmine_home.escolherProdutoMinicart)
            .should('be.visible')
            .click()

        cy.url()
            .should('include','/colecao/todos-produtos?page=1')
    });

    it('Validar banner principal', () => {
        cy.get(locators.jasmine_home.bannerPrincipal)
            .should('be.visible')

        cy.get(locators.jasmine_home.slideBannerPrincipal)
            .click()
            .wait(1000)
            .click()
    });

    it('Validar os infocards', () => {
        
        cy.get(locators.jasmine_home.modalInfoCards)
            .should('be.visible')

        cy.get(locators.jasmine_home.infocardsUnitarios)
            .and('have.length', 4)
    
    });

    it('Validar a aba de Categorias', () => {
        
        cy.get(locators.jasmine_home.categorias)
            .should('be.visible')

        cy.get(locators.jasmine_home.quantidadeCategorias)
            .should('have.length', 6)

        cy.get(locators.jasmine_home.categoriasUnitarios)
            .eq(1)
            .should('be.visible')
            .click()
            
        cy.url()
            .should('include','/aveias?page=1')

    });

    it('Validar se a página home possui os dois banners', () => {

        cy.scrollTo(0, 800)
        cy.get(locators.jasmine_home.banner)
            .first()
            .should('be.visible')

        cy.wait(1500)

        cy.scrollTo(0, 2300)
        cy.get(locators.jasmine_home.banner)
            .last()
            .should('be.visible')
    });

    it('Validar se a newsletter está disponível', () => {
        
        cy.scrollTo('bottom')

        cy.get(locators.jasmine_home.newsletter.modalNewsletter)
            .should('be.visible')

        cy.get(locators.jasmine_home.newsletter.inputNome)
            .first()
            .should('be.visible')

        cy.get(locators.jasmine_home.newsletter.inputEmail)
            .last()
            .should('be.visible')
    });

    it.only('Enviando a newsletter', () => {
        
        cy.scrollTo('bottom')
        
        cy.fixtures("users").then((users) => {
            cy.get(locators.jasmine_home.newsletter.inputNome)
                .first()
                .type(users.user.nome)

            cy.get(locators.jasmine_home.newsletter.inputEmail)
                .last()
                .type(users.use.email)

        })

        cy.get(locators.jasmine_home.newsletter.checkPoliticaPrivacidade)
            .click()

        cy.get(locators.jasmine_home.newsletter.btnEnviar)
            .click()

        cy.get(locators.jasmine_home.newsletter.msgSucesso)
            .should('be.visible')
            .and('contain', 'Você foi cadastrado com sucesso!')   

    });

    it('Adicionando produto no carrinho', () => {
                
        cy.get(locators.jasmine_home.btnAdicionarProdutoAoCarrinho)
            .first()
            .click()

        cy.wait(1500)

        cy.get(locators.jasmine_home.valorProdutosNoCarrinho)
            .should('be.visible')
            .and('contain.text', '1')
            .click()

        cy.get(locators.jasmine_home.modalProdutoNoCarrinho)
            .should('be.visible')  
    });

    it('Validar se o footer possui a logo da social', () => {
        
        cy.scrollTo('bottom')

        cy.get(locators.jasmine_home.logoSocial)
            .should('be.visible')
            .and('have.attr', 'alt', 'Social S.A.')

    });

    it('Entrando na página de produto', () => {
        
        cy.wait(2500)
        cy.scrollTo(0, 500)

        cy.get(locators.jasmine_home.produto)
            .first()
            .click({force:true})

        cy.url()
            .should('include','/produto/', {timeout:10000})

        cy.get(locators.jasmine_home.breadcrumbPDP)
            .first()
            .should('be.visible')

        cy.get(locators.jasmine_home.btnAdicionaroCarrinhoPDP)
            .should('be.visible')
    });

})