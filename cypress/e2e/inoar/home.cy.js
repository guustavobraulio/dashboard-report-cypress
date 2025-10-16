describe('Validação da página Home', () => {
    
    beforeEach(() => {
        cy.viewport(1920, 1080)
        cy.intercept('**/google-analytics.com/**', { statusCode: 200, body: {} })
        cy.intercept('**/googletagmanager.com/**', { statusCode: 200, body: {} })
        cy.visit('https://www.loja.inoar.com.br', {timeout: 120000}, {
            onBeforeLoad: (win) => {
            }
        })
    });
    
    it('Validar se a logo da marca está presente', () => {
        
        cy.get('[class="w-32 md:w-auto"]')
            .should('be.visible')
    });

    it('Validar o slide do banner principal', () => {
        
        cy.get('[class="slick-next slick-arrow"]')
            .first()
            .click()
            .wait(1000)
            .click()

    });

    it('Verificando se ao clicar em Favoritar produto, ele leva para o /login', () => {
        
        cy.scrollTo('200', { duration: 2000 })

        cy.get('#wishlist-icon-150473')
            .click()

        cy.url()
            .should('include','/Login/Authenticate?returnUrl=https://www.loja.inoar.com.br/')

    });

    it.only('Clicando em algum produto e levando para página de produto', () => {
        
        cy.scrollTo(0, 500)

        cy.get('[class="product-name-150473 truncate line-clamp-3 whitespace-normal text-lg leading-5 my-2 text-gray-ino-1100 h-[60px]"]')
            .first()
            .click()

        cy.url()
            .should('include','/produto/')

        cy.get('[class="my-4"]')
            .should('be.visible')   
    });

    it.only('Validar se o slide da vitrine de produtos funciona', () => {
        
        cy.scrollTo('bottom')

        cy.get('[class="slick-next slick-arrow"]')
            .last()
            .click()
            .wait(1000)
            .dblclick()
    });



});