describe('Validação da página Home', () => {
    
    beforeEach(() => {
        
        cy.viewport(1920,1080)
        cy.visit('https://www.shopmulti.com.br/')

    });
    
    it('Validação da logo da marca no header', () => {
        
        cy.get('[class="cy-header-logo-desktop max-w-none"]')
            .should('be.visible')

    });

    it('Validar as categorias do header', () => {
        
        cy.get('[class="flex justify-center items-center gap-11"]')
            .should('be.visible')
            
        cy.get('[class="flex justify-center items-center gap-11"]>li')
            .should('have.length', 6)
    });

    it('Buscar algum produto no input de buscar ', () => {
        
        cy.get('[class="search-bar-term input font-poppins join-item flex-grow rounded-l-[40px] pl-4 h-8 border-0 focus:outline-none focus:isolation-auto sm-laptop:rounded-l-lg sm-laptop:h-9"]')
            .type('Camisa Masculina Essendi')
            .type('{ENTER}')

        cy.url()
            .should('include','/s?q=Camisa+Masculina+Essendi')
    });

    it('Clicando no ícone de Favoritos no header', () => {
        
        cy.get('[class="cy-header-wishlist-link flex items-center text-white text-sm font-semibold font-poppins"]')
            .click()

        cy.url()
            //.should('include','/login?returnUrl=%2Faccount%23%2Fwishlist')
            .should('include','/account#/wishlist')
    });

    it('Validar a funcionalidade de Login / Minha conta', () => {
        
        cy.get('[class="cy-header-login-link flex items-center text-white text-sm font-semibold font-poppins w-max"]')
            .click()

        cy.wait(2500)

        // cy.url()
        //     .should('include','/login?returnUrl=%2Faccount')
        cy.url()
            .should('include','/account')
    });

    it('Validar o minicart vazio', () => {
        
        cy.get('[class="btn no-animation btn-circle btn-sm lg:min-w-[98px] indicator flex items-center flex-nowrap w-fit btn-ghost hover:bg-transparent"]')
            .click()

        cy.get('[class="bg-minicart-empty bg-no-repeat justify-center bg-contain bg-center sm-laptop:bg-cover flex flex-col items-center h-full overflow-hidden"]')
            .should('be.visible')

        cy.get('[class="cy-minicart-title-text block text-center font-poppins text-black-200 text-3xl leading-10"]')
            .should('be.visible')
            .should('have.text', 'Meu carrinho')

        cy.get('[class="btn no-animation block border-0 mx-auto rounded-full w-56 h-10 bg-primary text-white font-poppins font-medium text-base text-center mt-4"]')
            .should('be.visible')
            .click()
        
        cy.get('[class="bg-minicart-empty bg-no-repeat justify-center bg-contain bg-center sm-laptop:bg-cover flex flex-col items-center h-full overflow-hidden"]')
            .should('not.be.visible')
    });

    it('Acessando alguma categoria do header', () => {
        
        cy.get('[class="text-sm font-poppins py-1 px-5 rounded-[10px] text-white capitalize border border-white group group-hover/drop:bg-white group-hover/drop:text-primary transition-colors"]')
            .eq(1)
            .click()
            
        cy.url()
            .should('include','/cuidados-pessoais')

    });

    it('Verificar se a Multicategoria está disponível', () => {
        
        cy.scrollTo(0, 300)

        cy.get('[class="cy-categories-list flex gap-2 w-full px-3 pb-2 overflow-x-scroll sm-tablet:justify-center sm-laptop:gap-[76px] sm-laptop:p-0 sm-laptop:overflow-auto"]')
            .should('be.visible')
            .children()
            .should('have.length', 3)

    });

    it('Clicando em Visualizar Produto', () => {
        
        cy.scrollTo(0, 700)

        cy.get('[class="block no-underline border border-green-300/80 rounded w-full py-3 mt-auto font-poppins text-xs leading-tight text-center text-green-300 transition-colors hover:bg-green-300/80 hover:text-white hover:transition-colors"]')
            .first()
            .should('be.visible')
            .click()        
    });

    it('Validar o footer', () => {
        
        cy.scrollTo('bottom')

        cy.get('[class="flex flex-col gap-10 pb-5 sm-laptop:pt-12 pt-0"]')
            .should('be.visible')

        cy.get('[class="flex flex-col gap-2 flex-auto items-center px-[0] py-[10px] rounded-[2px] order-4 sm-tablet:order-2 border border-solid border-gray-300/50 sm-tablet:border-none"]')
            .should('be.visible')
            .should('have.text','Managed by')
        
        cy.get('[class="Cy-footer-socialsa-link"]>img')
            .should('be.visible')
    });
    
});