import locators from "../../support/locators";

describe('[Jasmine] Validação das imagens via API', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.visit(Cypress.URLS.jasmine_home);
    });

    it('Validar status das imagens dos produtos', () => {
        // Aguarda um tempo para garantir que o JS carregou e as imagens foram injetadas
        cy.wait(3000);

        // Seleciona TODAS as imagens da página para garantir que nada está quebrado
        cy.get('img')
            .should('have.length.greaterThan', 0)
            .each(($img, index) => {
                const src = $img.attr('src');
                const srcset = $img.attr('srcset');

                // Valida o SRC principal
                if (src && src.startsWith('http')) {
                    cy.request({
                        url: src,
                        method: 'GET', // GET é mais garantido para imagens que HEAD em alguns CDNs
                        failOnStatusCode: false
                    }).then((response) => {
                        expect(response.status, `Imagem ${index} src: ${src}`).to.eq(200);
                    });
                }

                // Valida URLs dentro do SRCSET, se houver
                // O problema relatado pelo usuário (deco-assets) estava visível no network/srcset
                if (srcset) {
                    const urls = srcset.split(',')
                        .map(entry => entry.trim().split(' ')[0]) // Pega apenas a URL, remove o descritor de largura (ex: 326w)
                        .filter(url => url.startsWith('http'));

                    urls.forEach((url) => {
                        cy.request({
                            url: url,
                            method: 'GET',
                            failOnStatusCode: false
                        }).then((response) => {
                            expect(response.status, `Imagem ${index} srcset: ${url}`).to.eq(200);
                        });
                    });
                }
            });
    });
    it('Validar que a vitrine de produtos está visível', () => {
        cy.get(locators.jasmine_home.vitrineProdutos)
            .should('exist')
            .and('be.visible');

        // Opcional: Validar que existem produtos dentro da vitrine
        cy.get(locators.jasmine_home.vitrineProdutos)
            .find('a[href*="/produto/"]') // Geralmente produtos são links
            .should('have.length.greaterThan', 0);
    });
});
