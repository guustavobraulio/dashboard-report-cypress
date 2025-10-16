/////////////////////
// LOJA SHOPVINHO //
///////////////////

Cypress.Commands.add("FechandoModalIdade", () => {
  cy.viewport(1920, 1080);
  cy.visit("https://www.shopvinho.com.br/");

  cy.get('[class="modal-box w-[300px] h-fit border border-[#de1d49]"]').should(
    "be.visible"
  );

  cy.get(
    '[class="px-2.5 py-1 text-white text-15 bg-red-600 rounded-5"]'
  ).click();
}),
Cypress.Commands.add("AcessandoPaginaProduto", () => {
  cy.scrollTo(0, 500);

  cy.get('[class="bg-base-100 col-span-full row-span-full rounded w-full duration-100 transition-scale scale-100 lg:group-hover:scale-125"]')
    .first()
    .should("be.visible")
    .click();

  cy.get('[class="breadcrumbs p-0 mb-5 my-12 lg:mb-12"]', {timeout: 10000})
    .should("be.visible");

  }),

Cypress.Commands.add("AcessandoDepartamento", () => {
  cy.get('[class="navbar-menu divide-y w-full md:flex md:divide-y-0 md:space-x-4"]>li')
    .first()
    .click();

  cy.url()
    .should("include", "/vinhos");
  });




/////////////////////
// LOJA JASMINE ////
///////////////////

Cypress.Commands.add("AcessandoPaginaProduto_Jasmine", () => {
 
  cy.viewport(1920,1080)
  cy.visit('https://www.loja.jasminealimentos.com/')
  
  cy.wait(2500)
  cy.scrollTo(0, 500)

  cy.get('[class="object-cover rounded mx-auto col-span-full row-span-full transition-opacity opacity-0 lg:group-hover:opacity-100"]')
    .first()
    .click({ force: true })

  cy.url()
    .should('include', '/produto/', { timeout: 10000 })

  cy.get('[class="cy-breadcrumb breadcrumbs py-1.5 px-2.5 text-sm/4 font-normal after:content-none sm-tablet:pl-0"]')
    .first()
    .should('be.visible')

  cy.get('[class="max-w-full flex-row w-full flex-1 flex p-0 items-center justify-center rounded bg-green-300 gap-2.5 hover:bg-green-300 btn btn-primary no-animation"]')
    .should('be.visible')

}),

Cypress.Commands.add("AdicionandoProdutoNoCarrinho_Jasmine", () => {

  cy.AcessandoPaginaProduto_Jasmine()

  cy.get('[class="max-w-full flex-row w-full flex-1 flex p-0 items-center justify-center rounded bg-green-300 gap-2.5 hover:bg-green-300 btn btn-primary no-animation"]')
    .click()

  cy.get('[class="cy-minicart-counter indicator-item top-2 badge font-bold bg-primary text-white size-[18px] rounded-full border-none text-xs"]')
    .should('be.visible')
    .should('have.text', '01')

  cy.get('[class="cy-minicart-button indicator flex justify-end items-center w-16 sm-laptop:w-auto"]')
    .click()

  cy.get('[class="cy-aside bg-white flex flex-col h-full"]')
    .should('be.visible')

  cy.get('[class="cy-minicart-item grid grid-rows-1 gap-2"]')
    .should('be.visible')

  cy.get('[class="cy-minicart-item-counter outline-none text-2xl leading-6 w-6 text-center"]')
    .first()
    .should('be.visible')
    .should('have.value', '1')

}), 

Cypress.Commands.add("AumentandoQuantidadeProduto_Jasmine", () => {

  cy.get('[class="cy-minicart-item-counter-plus btn btn-square btn-ghost no-animation min-h-7 h-7 w-8"]')
    .first()
    .dblclick()
    .wait(1000)
    .dblclick()

  cy.get('[class="cy-minicart-item-counter outline-none text-2xl leading-6 w-6 text-center"]')
    .should('be.visible')
    .should('have.value', '4')

})


