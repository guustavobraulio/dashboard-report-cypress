import locators from "../../support/locators";

describe('[Easy Commerce] Validando componentes dentro do Header', () => {
    
    let buscarProduto = 'óleo';
    let msgCarrinhoVazio = 'Seu carrinho está vazio';

    beforeEach(() => {
        cy.viewport(Cypress.VIEWPORT.desktop.width, Cypress.VIEWPORT.desktop.height);
        cy.visit(Cypress.URLS.easyCommerce_home);
    });

    it('Deve exibir o logo da empresa', () => {
        cy.get(locators.easyCommerce_home.logoMarca)
            .should('be.visible');
    });

    it('Validar o slide da vitrine', () => {
        
        cy.scrollTo(0, 300)

        cy.get(locators.easyCommerce_home.slideVitrine)
            .eq(1)
            .should('be.visible')
            .click()
    });

    it('Validar se as categorias estão presentes', () => {
        
        cy.get(locators.easyCommerce_home.categoriasHeader)
            .should('be.visible')

        cy.get(locators.easyCommerce_home.categorias.azeitesEVinagres)
            .should('be.visible')

        cy.get(locators.easyCommerce_home.categorias.docesEChocolates)
            .should('have.text', 'Doces e Chocolates')
            .should('be.visible')

        cy.get(locators.easyCommerce_home.categorias.mercearia)
            .should('have.text', 'Mercearia')
            .should('be.visible')

        cy.get(locators.easyCommerce_home.categorias.enlatados)
            .should('have.text', 'Enlatados')
            .should('be.visible')

        cy.get(locators.easyCommerce_home.categorias.ofertas)
            .should('have.text', 'Ofertas')
            .should('be.visible')

    });

    it('Validando o campo de Busca', () => {
        
        cy.get(locators.easyCommerce_home.inputBuscar)
            .first()
            .type(buscarProduto)
            .type("{enter}")

        cy.url()
            .should('include','/s?q=%C3%B3leo&page=1')

        cy.get(locators.easyCommerce_departamento.modalProduto)
            .should('be.visible')   
    });

    it('Validar o ícone Minha Conta', () => {
        
        cy.get(locators.easyCommerce_home.iconMinhaConta)
            .should('be.visible')
            .click()

        cy.url()
            .should('include', '/login')
    });

    it('Validar o minicart vazio', () => {
        
        cy.wait(1500)

        cy.get(locators.easyCommerce_home.minicart.iconMinicart)
            .first()
            .should('be.visible')
            .click()

        cy.get(locators.easyCommerce_home.minicart.modalMinicart)
            .should('be.visible')

        cy.contains(msgCarrinhoVazio)
            .should('be.visible')

        cy.get(locators.easyCommerce_home.minicart.btnAdicionarProduto)
            .should('be.visible')
            .click()

        cy.get(locators.easyCommerce_home.minicart.modalMinicart)
            .should('not.visible')
    });

    it('Clicando em uma das categorias na vitrine - Ofertas', () => {
        cy.get(locators.easyCommerce_home.categoriaOfertas)
            .first()
            .should('be.visible')
            .click()
    });

    it('Adicionando produto via botão de compra da vitrine', () => {
        
        cy.scrollTo(0, 500)

        cy.wait(1500)

        cy.get(locators.easyCommerce_home.btnAdicionarProdutoAoCarrinho)
            .first()
            .should('be.visible')
            .click()

        cy.get(locators.easyCommerce_home.minicart.iconMinicart)
            .first()
            .should('be.visible')
            .click()

        cy.get(locators.easyCommerce_home.minicart.modalMinicart)
            .first()
            .should('be.visible')
    });

    it('Validando os banners da Home', () => {
        
        cy.scrollTo(0, 700)

        cy.get(locators.easyCommerce_home.banners)
            .first()
            .should('be.visible')

        cy.scrollTo(0, 1200)

        cy.get(locators.easyCommerce_home.banners)
            .last()
            .should('be.visible')

    });

    it('Enviando a newsletter', () => {
        
        cy.scrollTo('bottom')

        cy.get(locators.easyCommerce_home.newsletter.modalNewsletter)
            .should('be.visible')   

        cy.fixture("users").then((users) => {
            cy.get(locators.easyCommerce_home.newsletter.inputNome)
                .first()
                .type(users.user.nome)

            cy.get(locators.easyCommerce_home.newsletter.inputEmail)
                .last()
                .type(users.user.email)
        })

        cy.get(locators.easyCommerce_home.newsletter.checkPoliticaPrivacidade)
            .last()
            .click()

        cy.get(locators.easyCommerce_home.newsletter.btnEnviar)
            .click()
            
    });

    it('Validando os modais com informações no footer', () => {
        cy.scrollTo('bottom')

        cy.get(locators.easyCommerce_home.footerContainer)
            .should('be.visible')
            .should('have.length', 1)
    });
});