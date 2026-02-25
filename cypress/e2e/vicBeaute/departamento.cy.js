import AcessandoDepartamento_VicBeaute from '../../support/commands'

describe('[Vic Beaute] Validação de departamento', () => {

    beforeEach(() => {

        cy.viewport(1920, 1080)
        cy.visit('https://www.vicbeaute.com.br/')
        cy.wait(2500)
    })

    it('Validando uma das categorias da página de categorias.', () => {


        cy.contains('Para presentear')
            .click()

        cy.url()
            .should('include', '/kits')

    })

    it('Validando o breadcrumb da página de departamento', () => {

        cy.AcessandoDepartamento_VicBeaute()

        cy.wait(3000)

        cy.get('[class="vtex-breadcrumb-1-x-arrow vtex-breadcrumb-1-x-arrow--1 ph2 c-muted-2"]')
            .should('be.visible')
            .should('have.text', 'KITS')
    })

    it('Validar um filtro do departamento - Multiuso', () => {

        cy.AcessandoDepartamento_VicBeaute()

        cy.wait(2000)

        cy.get('[class="links-list"]')
            .should('be.visible')
            .should('have.text', 'Todosmultiusolábiosolhosface')

        cy.contains('multiuso')
            .click()

        cy.url()
            .should('include', '/maquiagem/multiuso')
    })

    it('Validar o filtrar por da página de departamento - Mais recentes', () => {

        cy.AcessandoDepartamento_VicBeaute()

        cy.wait(2700)

        cy.get('[class="vtex-search-result-3-x-orderByDropdown relative pt1 justify-end w-100 w-auto-ns ml-auto"]')
            .click()

        cy.wait(1000)

        cy.contains('Mais recentes')
            .click()

        cy.url()
            .should('include', '/kits?order=OrderByReleaseDateDESC')
    })

    it('Clicando no botão de adicionar ao carrinho algum produto', () => {


        cy.AcessandoDepartamento_VicBeaute()

        cy.get('[class="vtex-button bw1 ba fw5 v-mid relative pa0 lh-solid br2 min-h-regular t-action bg-action-primary b--action-primary c-on-action-primary hover-bg-action-primary hover-b--action-primary hover-c-on-action-primary pointer w-100 "]')
            .should('be.visible')
            .first()
            .click()


    })



})