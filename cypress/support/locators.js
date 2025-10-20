const locators = {

    ///////////////////////////////////
    // Easy Commerce - Departamento //
    /////////////////////////////////
    easyCommerce_departamento: {
        breadcrumb: '[class="!hidden lg:!flex gap-1"]',
        tituloSEO: '[class="flex flex-wrap items-center gap-2"]',
        textoSEO: '[class="w-full max-w-none line-clamp-1 lg:peer-checked:line-clamp-none transition-all duration-300 pb-1 text-sm text-gray-10"]',
        ordenarPorMenorPreco: '[data-cy="Menor Preço"]',
        modalProduto: '[class="card card-compact group text-sm lg:max-w-ft-210 border border-gray-15 rounded-lg h-full min-w-[160px] max-w-[300px]"]'
    },

    easyCommerce_home: {
        logoMarca: '[data-cy="logo-desktop"]',
        slideVitrine: '[data-slide="next"]>svg>use',
        categoriasHeader: '[class="flex gap-6"]',
        categorias: {
            azeitesEVinagres: '[data-cy="menu-Azeites e Vinagres"]',
            docesEChocolates: '[data-cy="menu-Doces e Chocolates"]',
            mercearia: '[data-cy="menu-Mercearia"]',
            enlatados: '[data-cy="menu-Enlatados"]',
            ofertas: '[data-cy="menu-Ofertas"]'
        },
        inputBuscar: '[class="input input-bordered join-item flex-grow border-none focus:outline-none focus:ring-0 focus:border-none lg:px-0"]',
        iconMinhaConta: '[class="flex items-center gap-8 relative max-w-[102px] w-full mx-auto"]>a',
        minicart: {
            iconMinicart: '[class="btn btn-square btn-sm btn-ghost no-animation hover:bg-transparent"]',
            modalMinicart: '#minicartdrawer',
            btnAdicionarProduto: '[data-cy="add-products"]',
        },
        categoriaOfertas: '[class="flex flex-col items-center text-center"]',
        btnAdicionarProdutoAoCarrinho: '[class="hover:opacity-70"]>use',
        seletorQuantidadeProduto: '[data-item-id="13"]',
        banners: '[class="md:hidden lg:flex max-w-ft-1130 h-[350px] object-cover"]',
        newsletter: {
            modalNewsletter: '[class="flex flex-col gap-y-3.5 bg-gray-9 w-full py-8 px-4 bg-gray-15 lg:h-[230px]"]',
            inputNome: '[class="w-full h-[38px] text-base-content outline-none px-3 placeholder:text-gray-20 bg-transparent border border-black-10 border-opacity-50 placeholder:text-xs font-black-10 placeholder:font-Poppins"]',
            inputEmail: '[class="w-full h-[38px] text-base-content outline-none px-3 placeholder:text-gray-20 bg-transparent border border-black-10 border-opacity-50 placeholder:text-xs font-black-10 placeholder:font-Poppins"]',
            checkPoliticaPrivacidade: '[class="check-aceite"]',
            btnEnviar: '[class="disabled:loading h-10 min-h-10 font-normal text-xs rounded w-full bg-gray-25 text-white font-Poppins lg:max-w-ft-200 bg-gold-0 text-white-0"]'
        },
        footerContainer: '[class="w-full max-w-ft-1452 mx-auto grid grid-cols-4 gap-4 items-center"]'
    },

    easyCommerce_pdp: {
        btnAdicionarAoMiniCart: '[class="w-full rounded-none bg-green-5 font-medium text-base hover:bg-green-5 btn btn-primary no-animation"]',
        modalMinicartProdutoAdicionado: '[data-cy="minicart-list"]',
        aumentandoQuantidade: '[data-cy="increase-quantity-pdp"]',
        QuantidadeValue: '[class="text-center text-base lg:text-xl font-medium font-Inter w-full max-w-[30px] bg-transparent quantity-zero outline-none pointer-events-none"]',
        imagemProduto: '[class="hidden lg:block group-disabled:border-gray-150 border border-solid object-cover w-full h-full"]'
    },


    //////////////
    // Jasmine //
    ////////////
    jasmine_departamento: {
        breadcrumb: '[class="max-w-fit bg-black/25 backdrop-blur pr-2.5 py-1.5 rounded ml-6 sm-tablet:ml-0"]',
        btnVerMais: '[class="mx-auto sm:max-w-[343px] btn btn-ghost h-10 min-h-fit w-full rounded bg-primary font-medium text-white text-base/tight hover:bg-primary hover:border-none"]',
        modalFooter: '[class="cy-footer bg-primary pl-5 pt-1.5 pr-2 pb-3.5 rounded-t-lg sm:py-10 sm:px-0"]',
        logoSocial: '[class="cy-footer-managed-by-icon"]'
    },

    jasmine_home: {
        header: {
            categorias: '[class="flex gap-4 sm-laptop:gap-8"]',
            modalCategorias: '[class="flex gap-4 sm-laptop:gap-8"]>li',
            campoBuscar: '[class="flex items-center gap-2 w-[180px] rounded-2xl px-4 py-2.5 border border-primary"]',
            inputBuscar: '[name="busca"]',
            iconMinicart: '[class="cy-minicart-icon btn btn-square btn-sm btn-ghost no-animation w-9 h-9"]',
            modalMinicart: '[class="cy-minicart-content flex flex-col flex-grow justify-center items-center overflow-hidden w-full [.htmx-request_&]:pointer-events-none [.htmx-request_&]:opacity-60 [.htmx-request_&]:cursor-wait transition-opacity duration-300"]',
        },
        escolherProdutoMinicart: '[class="cy-empty-cart-button hover:bg-primary hover:border-none btn btn-outline no-animation w-[264px] rounded-[5px] bg-primary text-white h-10 mt-5"]',
        bannerPrincipal: '[class="object-cover w-full h-full hidden sm-tablet:flex"]',
        slideBannerPrincipal: '[class="cy-slider-next-button undefined"]',
        modalInfoCards: '[class="carousel-item flex justify-center gap-5"]',
        infocardsUnitarios: '[class="carousel-item flex justify-center gap-5"]>div',
        categorias: '[class="carousel-item w-full justify-center gap-3 sm:gap-6 pt-14 pb-5 sm:pt-0 sm:pb-0"]',
        quantidadeCategorias: '[class="carousel-item w-full justify-center gap-3 sm:gap-6 pt-14 pb-5 sm:pt-0 sm:pb-0"]>a',
        categoriasUnitarios: '[class="cy-category-card flex flex-col items-center gap-4 ipad-air:max-w-[16%] ipad-air:w-full"]',
        banner: '[class="cy-banner block w-fit h-fit mx-auto rounded-lg mt-2.5 sm:w-[90%] sm:max-w-[772px] sm:mx-auto lg:max-w-[1368px]"]',
        newsletter: {
            modalNewsletter: '[class="container flex flex-col gap-4 sm:gap-6 w-full py-5 sm:py-10 bg-white-500 mt-8 pt-0 max-w-none sm:!py-0 sm:mt-12 sm:mx-0 sm:max-w-none md-tablet:flex-row sm-laptop:items-center sm-laptop:justify-center "]',
            inputNome: '[class="cy-nw-input input input-bordered flex-grow rounded w-full h-[38px] text-center text-black"]',
            inputEmail: '[class="cy-nw-input input input-bordered flex-grow rounded w-full h-[38px] text-center text-black"]',
            checkPoliticaPrivacidade: '#newsletter', 
            btnEnviar: '[class="btn btn-primary w-44 h-9 min-h-9 bg-green-200  hover:bg-green-200  mx-auto rounded xl:w-full newsletter-button-submit"]',
            msgSucesso: '[class="text-xl text-black text-center sm-laptop:text-[22px]/7"]',
        },
        btnAdicionarProdutoAoCarrinho: '[class="flex gap-2.5 flex-grow peer-checked:opacity-0 peer-checked:hidden transition-opacity font-bold text-white !rounded-[5px] flex justify-center items-center bg-green-300 w-full h-10 rounded-xl hover:bg-green-300"]',
        valorProdutosNoCarrinho: '[class="cy-minicart-counter indicator-item top-2 badge font-bold bg-primary text-white size-[18px] rounded-full border-none text-xs"]',
        modalProdutoNoCarrinho: '[class="pb-4 border-b border-solid border-gray-100 last-of-type:border-b-0"]',
        logoSocial: '[class="cy-footer-managed-by-icon"]',
        produto: '[class="object-cover rounded mx-auto col-span-full row-span-full transition-opacity opacity-0 lg:group-hover:opacity-100"]',
        breadcrumbPDP: '[class="cy-breadcrumb breadcrumbs py-1.5 px-2.5 text-sm/4 font-normal after:content-none sm-tablet:pl-0"]',
        btnAdicionaroCarrinhoPDP: '[class="max-w-full flex-row w-full flex-1 flex p-0 items-center justify-center rounded bg-green-300 gap-2.5 hover:bg-green-300 btn btn-primary no-animation"]'


    
    },

    jasmine_pdp: {
        breadcrumbPDP: '[class="flex lg:max-w-[940px] lg:mx-auto w-full sm-tablet:hidden sm-laptop:flex"]',
        iconeMiniCart: '[class="cy-minicart-button indicator flex justify-end items-center w-16 sm-laptop:w-auto"]',
        modalMiniCart: '[class="cy-aside bg-white flex flex-col h-full"]',
        componenteProdutoIndividual: '[class="cy-minicart-item grid grid-rows-1 gap-2"]',
        quantidadeValue: '[class="cy-minicart-item-counter outline-none text-2xl leading-6 w-6 text-center"]',
        removerProdutoMinicart: '[class="cy-minicart-item-remove btn btn-ghost btn-square no-animation flex flex-col gap-1.5 justify-start items-center"]',
        textoCarrinhoVazio: '[class="cy-empty-cart-title font-medium text-2xl text-primary text-center "]',
        modalDescriçãoProduto: '[class="mt-14 sm-tablet:mx-auto sm-tablet:mb-6 sm-tablet:py-6 sm-tablet:max-w-[985px] sm-tablet:w-full border-b border-t sm-tablet:border-solid pt-6 border-white-400 mx-3 "]',
        slideVitrine: '[class="disabled:hidden"]',
        aumentarQuantidadeDeProduto: '[class="cy-minicart-item-counter-plus btn btn-square btn-ghost no-animation min-h-7 h-7 w-8"]',
        quantidadeValueProduto: '[class="cy-minicart-item-counter outline-none text-2xl leading-6 w-6 text-center"]',
        



    }


}

export default locators
