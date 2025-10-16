describe('[Easy Commerce] Validando componentes dentro do Header', () => {
    
    beforeEach(() => {
        cy.viewport(1920,1080)
        cy.visit('https://easycommerce.deco.site/');
    });

    it('Deve exibir o logo da empresa', () => {
        cy.get('[data-cy="logo-desktop"]').should('be.visible');
    });

    it('Validar o slide da vitrine', () => {
        
        cy.scrollTo(0, 300)

        cy.get('[data-slide="next"]>svg>use')
            .eq(1)
            .should('be.visible')
            .click()
    });

    it('Validar se as categorias estão presentes', () => {
        
        cy.get('[class="flex gap-6"]')
            .should('be.visible')

        cy.get('[data-cy="menu-Azeites e Vinagres"]')
            .should('be.visible')

        cy.get('[data-cy="menu-Doces e Chocolates"]')
            .should('have.text', 'Doces e Chocolates')
            .should('be.visible')
            
        cy.get('[data-cy="menu-Mercearia"]')
            .should('have.text', 'Mercearia')
            .should('be.visible')

        cy.get('[data-cy="menu-Enlatados"]')
            .should('have.text', 'Enlatados')
            .should('be.visible')

        cy.get('[data-cy="menu-Ofertas"]')
            .should('have.text', 'Ofertas')
            .should('be.visible')

    });

    it('Validando o campo de Busca', () => {
        
        cy.get('[class="input input-bordered join-item flex-grow border-none focus:outline-none focus:ring-0 focus:border-none lg:px-0"]')
            .first()
            .type("óleo")
            .type("{enter}")

        cy.get('[class="card card-compact group text-sm lg:max-w-ft-210 border border-gray-15 rounded-lg h-full min-w-[160px] max-w-[300px]"]')
            .should('be.visible')   
    });

    it('Validar o ícone Minha Conta', () => {
        
        cy.get('[class="flex items-center gap-8 relative max-w-[102px] w-full mx-auto"]>a')
            .should('be.visible')
            .click()

        cy.url()
            .should('include', '/login')
    });

    it('Validar o minicart vazio', () => {
        
        cy.wait(1500)

        cy.get('[class="btn btn-square btn-sm btn-ghost no-animation hover:bg-transparent"]')
            .first()
            .should('be.visible')
            .click()

        cy.get('#minicartdrawer')
            .should('be.visible')

        cy.contains('Seu carrinho está vazio')
            .should('be.visible')

        cy.get('[data-cy="add-products"]')
            .should('be.visible')
            .click()

        cy.get('#minicartdrawer')
            .should('not.visible')
    });

    it('Clicando em uma das categorias na vitrine - Oferatas', () => {
        cy.get('[class="flex flex-col items-center text-center"]')
            .first()
            .should('be.visible')
            .click()
    });

    it('Adicionando produto via botão de compra da vitrine', () => {
        
        cy.scrollTo(0, 500)

        cy.wait(1500)

        cy.get('[class="hover:opacity-70"]>use')
            .first()
            .should('be.visible')
            .click()

        cy.get('[class="btn btn-square btn-sm btn-ghost no-animation hover:bg-transparent"]')
            .first()
            .should('be.visible')
            .click()

        cy.get('[data-item-id="13"]')
            .first()
            .should('be.visible')
    });

    it('Validando os banners da Home', () => {
        
        cy.scrollTo(0, 700)

        cy.get('[class="md:hidden lg:flex max-w-ft-1130 h-[350px] object-cover"]')
            .first()
            .should('be.visible')

        cy.scrollTo(0, 1200)

        cy.get('[class="md:hidden lg:flex max-w-ft-1130 h-[350px] object-cover"]')
            .last()
            .should('be.visible')

    });

    it('Enviando a newsletter', () => {
        
        cy.scrollTo('bottom')

        cy.get('[class="flex flex-col gap-y-3.5 bg-gray-9 w-full py-8 px-4 bg-gray-15 lg:h-[230px]"]')
            .should('be.visible')   

        cy.get('[class="w-full h-[38px] text-base-content outline-none px-3 placeholder:text-gray-20 bg-transparent border border-black-10 border-opacity-50 placeholder:text-xs font-black-10 placeholder:font-Poppins"]')
            .first()
            .type('Gustavo Test')

        cy.get('[class="w-full h-[38px] text-base-content outline-none px-3 placeholder:text-gray-20 bg-transparent border border-black-10 border-opacity-50 placeholder:text-xs font-black-10 placeholder:font-Poppins"]')
            .last()
            .type('g.teste@testeQA.com')

        cy.get('[class="check-aceite"]')
            .last()
            .click()

        cy.get('[class="disabled:loading h-10 min-h-10 font-normal text-xs rounded w-full bg-gray-25 text-white font-Poppins lg:max-w-ft-200 bg-gold-0 text-white-0"]')
            .click()
            
    });

    it('Validando os modais com informações no footer', () => {
        cy.scrollTo('bottom')

        cy.get('[class="w-full max-w-ft-1452 mx-auto grid grid-cols-4 gap-4 items-center"]')
            .should('be.visible')
            .should('have.length', 1)
    });
});