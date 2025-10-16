describe('[JASMINE] Validação da página home Jasmine', () => {
    beforeEach(() => {
        cy.viewport(1920,1080)
        cy.visit('https://www.loja.jasminealimentos.com')
    });

    it('Validar se as categorias estão disponíveis no header', () => {
        
        cy.get('[class="flex gap-4 sm-laptop:gap-8"]')
            .first()
            .should('be.visible')

        cy.get('[class="flex gap-4 sm-laptop:gap-8"]>li')
            .should('have.length', 3)

    });

    it('Pequisando por algum produto', () => {
        
        cy.get('[class="flex items-center gap-2 w-[180px] rounded-2xl px-4 py-2.5 border border-primary"]')
            .click()

        cy.get('[name="busca"]')
            .type('granolas')
            .wait(1500)
            .type('{enter}')

        cy.url()
            .should('include','/busca?busca=granolas&page=1')
    });

    it('Validar o minicart vazio ', () => {

        cy.get('[class="cy-minicart-icon btn btn-square btn-sm btn-ghost no-animation w-9 h-9"]')
            .click()
        
        cy.get('[class="cy-minicart-content flex flex-col flex-grow justify-center items-center overflow-hidden w-full [.htmx-request_&]:pointer-events-none [.htmx-request_&]:opacity-60 [.htmx-request_&]:cursor-wait transition-opacity duration-300"]')
            .wait(1500)
            .should('be.visible')
            .and('contain.text', 'Seu carrinho está vazio')

        cy.get('[class="cy-empty-cart-button hover:bg-primary hover:border-none btn btn-outline no-animation w-[264px] rounded-[5px] bg-primary text-white h-10 mt-5"]')
            .should('be.visible')
            .click()

        cy.url()
            .should('include','/colecao/todos-produtos?page=1')
    });

    it('Validar banner principal', () => {
        cy.get('[class="object-cover w-full h-full hidden sm-tablet:flex"]')
            .should('be.visible')

        cy.get('[class="cy-slider-next-button undefined"]')
            .click()
            .wait(1000)
            .click()
    });

    it('Validar os infocards', () => {
        
        cy.get('[class="carousel-item flex justify-center gap-5"]')
            .should('be.visible')

        cy.get('[class="carousel-item flex justify-center gap-5"]>div')
            .and('have.length', 4)
    
    });

    it('Validar a aba de Categorias', () => {
        
        cy.get('[class="carousel-item w-full justify-center gap-3 sm:gap-6 pt-14 pb-5 sm:pt-0 sm:pb-0"]')
            .should('be.visible')

        cy.get('[class="carousel-item w-full justify-center gap-3 sm:gap-6 pt-14 pb-5 sm:pt-0 sm:pb-0"]>a')
            .should('have.length', 6)

        cy.get('[class="cy-category-card flex flex-col items-center gap-4 ipad-air:max-w-[16%] ipad-air:w-full"]')
            .eq(1)
            .should('be.visible')
            .click()
            
        cy.url()
            .should('include','/aveias?page=1')

    });

    it('Validar se a página home possui os dois banners', () => {

        cy.scrollTo(0, 800)
        cy.get('[class="cy-banner block w-fit h-fit mx-auto rounded-lg mt-2.5 sm:w-[90%] sm:max-w-[772px] sm:mx-auto lg:max-w-[1368px]"]')
            .first()
            .should('be.visible')

        cy.wait(1500)

        cy.scrollTo(0, 2300)
        cy.get('[class="cy-banner block w-fit h-fit mx-auto rounded-lg mt-2.5 sm:w-[90%] sm:max-w-[772px] sm:mx-auto lg:max-w-[1368px]"]')
            .last()
            .should('be.visible')
    });

    it('Validar se a newsletter está disponível', () => {
        
        cy.scrollTo('bottom')

        cy.get('[class="container flex flex-col gap-4 sm:gap-6 w-full py-5 sm:py-10 bg-white-500 mt-8 pt-0 max-w-none sm:!py-0 sm:mt-12 sm:mx-0 sm:max-w-none md-tablet:flex-row sm-laptop:items-center sm-laptop:justify-center "]')
            .should('be.visible')

        cy.get('[class="cy-nw-input input input-bordered flex-grow rounded w-full h-[38px] text-center text-black"]')
            .first()
            .should('be.visible')

        cy.get('[class="cy-nw-input input input-bordered flex-grow rounded w-full h-[38px] text-center text-black"]')
            .last()
            .should('be.visible')
    });

    it('Enviando a newsletter', () => {
        
        cy.scrollTo('bottom')

        cy.get('[class="cy-nw-input input input-bordered flex-grow rounded w-full h-[38px] text-center text-black"]')
            .first()
            .type('Gustavo Teste')

        cy.get('[class="cy-nw-input input input-bordered flex-grow rounded w-full h-[38px] text-center text-black"]')
            .last()
            .type('gustavo.teste@email.com')

        cy.get('#newsletter')
            .click()

        cy.get('[class="btn btn-primary w-44 h-9 min-h-9 bg-green-200  hover:bg-green-200  mx-auto rounded xl:w-full newsletter-button-submit"]')
            .click()

        cy.get('[class="text-xl text-black text-center sm-laptop:text-[22px]/7"]')
            .should('be.visible')
            .and('contain', 'Você foi cadastrado com sucesso!')   

    });

    it('Adicionando produto no carrinho', () => {
                
        cy.get('[class="flex gap-2.5 flex-grow peer-checked:opacity-0 peer-checked:hidden transition-opacity font-bold text-white !rounded-[5px] flex justify-center items-center bg-green-300 w-full h-10 rounded-xl hover:bg-green-300"]')
            .first()
            .click()

        cy.wait(1500)

        cy.get('[class="cy-minicart-counter indicator-item top-2 badge font-bold bg-primary text-white size-[18px] rounded-full border-none text-xs"]')
            .should('be.visible')
            .and('contain.text', '1')
            .click()

        cy.get('[class="pb-4 border-b border-solid border-gray-100 last-of-type:border-b-0"]')
            .should('be.visible')  
    });

    it('Validar se o footer possui a logo da social', () => {
        
        cy.scrollTo('bottom')

        cy.get('[class="cy-footer-managed-by-icon"]')
            .should('be.visible')
            .and('have.attr', 'alt', 'Social S.A.')

    });

    it('Entrando na página de produto', () => {
        
        cy.wait(2500)
        cy.scrollTo(0, 500)

        cy.get('[class="object-cover rounded mx-auto col-span-full row-span-full transition-opacity opacity-0 lg:group-hover:opacity-100"]')
            .first()
            .click({force:true})

        cy.url()
            .should('include','/produto/', {timeout:10000})

        cy.get('[class="cy-breadcrumb breadcrumbs py-1.5 px-2.5 text-sm/4 font-normal after:content-none sm-tablet:pl-0"]')
            .first()
            .should('be.visible')

        cy.get('[class="max-w-full flex-row w-full flex-1 flex p-0 items-center justify-center rounded bg-green-300 gap-2.5 hover:bg-green-300 btn btn-primary no-animation"]')
            .should('be.visible')
    });

})