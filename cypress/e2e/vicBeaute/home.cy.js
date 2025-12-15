describe('[Vic Beaute] Validação da página inicial', () => {

    beforeEach(() => {

        cy.viewport(1920, 1080)
        cy.visit('https://www.vicbeaute.com.br/')
        cy.wait(2500)
    })

    it('Deve validar as categorias do header.', () => {

        cy.get('[class="vtex-sticky-layout-0-x-container vtex-sticky-layout-0-x-container--header-container z-999 relative left-0 right-0"]')
            .should('be.visible')
    }),

        it('Validar se a página possui topbar', () => {

            cy.get('[class="flex-layout-row-wrapper shipping-free"]')
                .should('be.visible')
        })

    it('Validar todas as categorias do header', () => {
        cy.get('[class="vtex-menu-2-x-menuContainer vtex-menu-2-x-menuContainer--menu-desk list flex pl0 mv0 flex-row"]')
            .should('be.visible')
            .should('have.length', 1)
    })

    it('Validar o input de busca', () => {
        cy.get('[class="vtex-modal-layout-0-x-triggerContainer vtex-modal-layout-0-x-triggerContainer--search-bar-container bg-transparent pa0 bw0 dib"]')
            .click()

        cy.wait(2500)

        cy.get('[class="flex-layout-row-wrapper search-bar-desktop"]')
            .should('be.visible')

        cy.get('#downshift-0-input')
            .click()
            .type('batom vermelho')
            .type('{enter}')

        cy.wait(2600)

        cy.get('[class="flex mt0 mb0 pt0 pb0    justify-between vtex-flex-layout-0-x-flexRowContent vtex-flex-layout-0-x-flexRowContent--title-and-filters items-stretch w-100"]')
            .should('be.visible')

    })

    it('Validar se scroll dos banners principais estão funcionando', () => {
        cy.get('[class="main__container_carousel carousel_desktop"]>div')
            .should('be.visible')

        cy.get('[class="slick-arrow slick-next"]')
            .click()
            .wait(1200)
            .click()
    })

    it('Validar se a home possui vitrine de conteúdos', () => {
        cy.get('[class="vtex-store-components-3-x-container ph3 ph5-m ph2-xl mw9 center "]')
            .should('be.visible')
            .should('have.length', 2)
    })

    it('Validar se a newsletter está funcionando', () => {

        cy.wait(2500)
        cy.scrollTo('bottom')

        cy.get('[class="custom-newsletter cy-newsletter"]')
            .should('be.visible')

        cy.get('[class="texto-newsletter__titulo"]')
            .should('be.visible')
            .should('have.text', 'Inscreva-se na nossa newsletter!')
    })

})