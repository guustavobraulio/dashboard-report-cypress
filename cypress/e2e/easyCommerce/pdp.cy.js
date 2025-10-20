import locators from "../../support/locators";

describe('[Easy Commerce] Validando as funcionalidades dentro da PDP', () => {
    
    beforeEach(() => {  
        cy.viewport(Cypress.VIEWPORT.desktop.width, Cypress.VIEWPORT.desktop.height);
        cy.visit(Cypress.URLS.easyCommerce_pdp);
    });
    
    it('Validar se a página de produto possui breadcrumb', () => {

        cy.get(locators.easyCommerce_departamento.breadcrumb)
            .should('be.visible');
    });

    it('Validar se o produto vai para o carrinho com sucesso', () => {
        cy.get(locators.easyCommerce_pdp.btnAdicionarAoMiniCart)
            .first()
            .should('be.visible')
            .click()

        cy.get(locators.easyCommerce_home.minicart.iconMinicart)
            .first()
            .click()

        cy.get(locators.easyCommerce_pdp.modalMinicartProdutoAdicionado)
            .should('be.visible')
    });

    it('Validando o seletor de quantidade de produto', () => {
        
        cy.get(locators.easyCommerce_pdp.aumentandoQuantidade)
            .first()
            .dblclick()

        cy.get(locators.easyCommerce_pdp.QuantidadeValue)
            .should('have.value', '1') // Alterar posteriormente para 3. 
    });

    it('Validando a funcionalidade de alterar a imagem do produto', () => {
        
        cy.get(locators.easyCommerce_pdp.imagemProduto)
            .last()
            .wait(1500)
            .first()
            .click()
    });
    
});