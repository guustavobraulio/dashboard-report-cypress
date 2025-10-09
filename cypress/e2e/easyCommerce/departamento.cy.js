describe('[Easy Commerce] Validação da página de departamento', () => {

    beforeEach(() => {
        let productURL = 'https://easycommerce.deco.site/ft---alimentacao';

        cy.viewport(1920, 1080)
        cy.visit(productURL);
    });

    it('Validar se a página de departamento possui breadcrumb', () => {
        cy.get('[class="!hidden lg:!flex gap-1"]')
            .should('be.visible');
    });

    it('Validar se a página possui título e SEO', () => {

        cy.get('[class="flex flex-wrap items-center gap-2"]')
            .should('be.visible')

        cy.get('[class="w-full max-w-none line-clamp-1 lg:peer-checked:line-clamp-none transition-all duration-300 pb-1 text-sm text-gray-10"]')
            .should('be.visible')
    });

    it('Validar a funcionalidade de Ordenar Por', () => {
        
        cy.get('[data-cy="Menor Preço"]')
            .last()
            .click()

        cy.url()
            .should('include', '/ft---alimentacao?sort=price%3Aasc&page=')

    });
});