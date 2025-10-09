describe('[Easy Commerce] Validando as funcionalidades dentro da PDP', () => {
    
    beforeEach(() => {
        let productURL = 'https://easycommerce.deco.site/fio-de-sutura-seda-preta-trancada-75cm-2-0-ag-60mm-623h_pai/p?skuId=341968';
        
        cy.viewport(1920,1080)
        cy.visit(productURL);
    });
    
    it('Validar se a página de produto possui breadcrumb', () => {
        
        cy.get('[class="!hidden lg:!flex gap-1"]')
            .should('be.visible');
    });

    it('Validar se o produto vai para o carrinho com sucesso', () => {
        cy.get('[class="w-full rounded-none bg-green-5 font-medium text-base hover:bg-green-5 btn btn-primary no-animation"]')
            .first()
            .should('be.visible')
            .click()

        cy.get('[class="indicator"]')
            .first()
            .click()

        cy.get('[data-cy="minicart-list"]')
            .should('be.visible')
    });

    it('Validando o seletor de quantidade de produto', () => {
        
        cy.get('[data-cy="increase-quantity-pdp"]')
            .first()
            .dblclick()

        cy.get('[class="text-center text-base lg:text-xl font-medium font-Inter w-full max-w-[30px] bg-transparent quantity-zero outline-none pointer-events-none"]')
            .should('have.value', '1') // Alterar posteriormente para 3. 
    });

    it('Validando a funcionalidade de alterar a imagem do produto', () => {
        
        cy.get('[class="hidden lg:block group-disabled:border-gray-150 border border-solid object-cover w-full h-full"]')
            .last()
            .wait(1500)
            .first()
            .click()
    });
    
});