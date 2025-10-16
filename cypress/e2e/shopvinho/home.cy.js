import FechandoModalIdade from '../../support/commands.js'


describe('[ShopVinho] Validação da página home', () => {
    
    let email = 'teste@qa.com.br'

    beforeEach(() => {
        cy.viewport(1920, 1080)
        cy.visit('https://www.shopvinho.com.br/');
    });
    
    it('Fechando o modal de idade', () => {
        cy.get('[class="modal-box w-[300px] h-fit border border-[#de1d49]"]')
            .should('be.visible')

        cy.get('[class="px-2.5 py-1 text-white text-15 bg-red-600 rounded-5"]')
            .click()
    });

    it('Adicionando produto no carrinho', () => {
        cy.FechandoModalIdade()

        cy.url()
            .should('include', 'https://www.shopvinho.com.br')

        cy.scrollTo(0, 500)

        cy.get('[class="transaction-colors duration-75 bg-complementary-1 active:bg-complementary-1-dark rounded-tl-10 rounded-bl-md rounded-br-10 flex items-center justify-center w-31/2 h-21/2"]')
            .first()
            .should('be.visible')
            .click()    
    });

    it('Validar se a página home possui os infocards', () => {        
        cy.FechandoModalIdade()
        
        cy.get('[class="carousel carousel-start gap-4 lg:gap-8 sm:ml-1/25 lg:ml-0 justify-between"]')
            .should('be.visible')
    });

    it('Validar a aba de Categorias', () => {
        cy.FechandoModalIdade()

        cy.get('[class="flex flex-col w-full items-center"]')
            .first()
            .should('be.visible')
            .should('contain.text', 'Categorias')

        cy.get('[class="carousel carousel-center w-full gap-9/2 max-sm:px-4 max-lg:px-6 lg:ml-0 justify-center"]')
            .should('be.visible')
    });

    it('Clicando em adicionar produto no carrinho', () => {
        cy.FechandoModalIdade()
        cy.scrollTo(0, 300)

        cy.get('[class="transaction-colors duration-75 bg-complementary-1 active:bg-complementary-1-dark rounded-tl-10 rounded-bl-md rounded-br-10 flex items-center justify-center w-31/2 h-21/2"]')
            .first()
            .should('be.visible')
            .click()

        cy.get('[class="fixed top-0 w-full right-0 h-full md:w-[475px] flex flex-col bg-white rounded-10 overflow-y-auto"]')
            .should('be.visible', {timeout: 10000})

        cy.get('[class="flex gap-[10px] py-5 px-0 w-full md:w-[390px] relative border-b-[1px] border-[#D4D4D4]"]')
            .should('be.visible')
    });

    it('Validar banners', () => {
        cy.FechandoModalIdade()

        cy.scrollTo(0, 2000)

        cy.get('[class="carousel carousel-center w-full gap-9/2 max-sm:px-4 max-lg:px-6 lg:ml-0 justify-center"]')
            .should('be.visible')
            .should('length', 2)
    });

    it('Validar o envio da newsletter', () => {
        cy.FechandoModalIdade()

        cy.scrollTo('bottom')

        cy.get('[name="email"]')
            .type(email)

        cy.get('#input')
            .click()

        cy.get('[class="rounded-[20px] bg-[#2d2d2c] h-9 w-[100px] ln-normal disabled:opacity-75 disabled:cursor-not-allowed"]')
            .click()

        cy.contains('Inscrito com sucesso!')
            .should('be.visible')
    });

    it('Validar se dentro do footer possui a logo da Social', () => {
        cy.FechandoModalIdade()
        cy.scrollTo('bottom')

        cy.wait(2000)

        cy.get('[class="partners-item"]')
            .should('be.visible')
            .should('length', 2)
    });

    it.only('Entrando na página de produto', () => {
        
        cy.FechandoModalIdade()

        cy.scrollTo(0, 500)

        cy.get('[class="bg-base-100 col-span-full row-span-full rounded w-full duration-100 transition-scale scale-100 lg:group-hover:scale-125"]')
            .first()
            .should('be.visible')
            .click()

        cy.get('[class="breadcrumbs p-0 mb-5 my-12 lg:mb-12"]', {timeout: 10000})
            .should('be.visible')
    });


});