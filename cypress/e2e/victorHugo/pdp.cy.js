describe("[VICTOR HUGO] Validando a página de produto", () => {
  beforeEach(function() {
    cy.viewport(1920, 1080);
    cy.intercept("**/google-analytics.com/**", { statusCode: 204 });
    cy.visit("https://www.victorhugo.com.br/", { setTimeout: 100000 });
    
  });
  
  it("Realizando a busca por produto", function() {
    cy.get('[data-testid="search-header-button"]')
        .click()

    cy.get('[data-testid="search-input-field"]')
        .type('Bolsa Charli VH Elos', '{ENTER}')

    cy.get('[data-testid="card-produto-titulo"]')
        .eq(0)
        .should('contain', 'Bolsa Charli VH Elos')
        .click()

    cy.url()
        .should('include','https://www.victorhugo.com.br/produto/bolsa-charli-vh-elos-002')

    cy.get('[class="w-full flex items-center h-12 justify-center bg-black text-sm text-white uppercase border hover:bg-white hover:text-black rounded"]')
        .click()

    cy.url()
        .should('include','https://www.victorhugo.com.br/store/shopping-cart')

  });
});
