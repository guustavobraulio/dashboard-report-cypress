describe('[Victor Hugo] Validar imagens de produtos', () => {

    beforeEach(() => {
        cy.viewport(1920, 1080)
        cy.visit('https://www.victorhugo.com.br/')
    })

    it('Deve validar imagens de produtos', () => {
        cy.wait(3000)
        cy.get('img')
            .should('have.length.greaterThan', 0);

        cy.get('img')
            .each(($img, index) => {
                const src = $img.attr('src');
                const srcset = $img.attr('srcset');

                if (src && src.startsWith('http')) {
                    cy.request({
                        url: src,
                        method: 'GET',
                        failOnStatusCode: false
                    }).then((response) => {
                        expect(response.status, `Imagem ${index} src: ${src}`).to.eq(200);
                    });
                }

                if (srcset) {
                    const urls = srcset.split(',')
                        .map(entry => entry.trim().split(' ')[0])
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
    })

    it("Validar vitrine de produtos", () => {
        cy.get(locators.victorHugo_home.vitrineProdutos)
            .should('exist')
            .and('be.visible');

        cy.get(locators.victorHugo_home.vitrineProdutos)
            .find('a[href*="/produto/"]')
            .should('have.length.greaterThan', 0);
    });

})