import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import 'primeicons/primeicons.css'
import Vue3Toastify from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Tooltip from 'primevue/tooltip';

createApp(App)
    .directive('tooltip', Tooltip)
    .use(PrimeVue, {
        theme: {
            preset: Aura,
             options: {
                darkModeSelector: 'system'
            }
        },
        locale: {
            dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
            dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
            monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
            monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
            today: 'Hoje',
            weekHeader: 'Sem',
            firstDayOfWeek: 0,
            dateFormat: 'dd/mm/yy',
            weak: 'Fraco',
            medium: 'Médio',
            strong: 'Forte',
            passwordPrompt: 'Digite uma senha',
            emptyFilterMessage: 'Nenhum resultado encontrado',
            emptyMessage: 'Nenhuma opção disponível',
            aria: {
                trueLabel: 'Verdadeiro',
                falseLabel: 'Falso',
                nullLabel: 'Não selecionado',
                star: '1 estrela',
                stars: '{star} estrelas',
                selectAll: 'Todos itens selecionados',
                unselectAll: 'Todos itens desmarcados',
                close: 'Fechar',
                previous: 'Anterior',
                next: 'Seguinte',
                navigation: 'Navegação',
                scrollTop: 'Rolar para Topo',
                moveTop: 'Mover para Topo',
                moveUp: 'Mover para Cima',
                moveDown: 'Mover para Baixo',
                moveBottom: 'Mover para Final',
                moveToTarget: 'Mover para Alvo',
                moveToSource: 'Mover para Fonte',
                moveAllToTarget: 'Mover Tudo para Alvo',
                moveAllToSource: 'Mover Tudo para Fonte',
                pageLabel: 'Página {page}',
                firstPageLabel: 'Primeira Página',
                lastPageLabel: 'Última Página',
                nextPageLabel: 'Página Seguinte',
                prevPageLabel: 'Página Anterior',
                rowsPerPageLabel: 'Linhas por página',
                jumpToPageDropdownLabel: 'Pular para Página Dropdown',
                jumpToPageInputLabel: 'Pular para Página Input',
                selectRow: 'Linha Selecionada',
                unselectRow: 'Linha Desmarcada',
                expandRow: 'Linha Expandida',
                collapseRow: 'Linha Recolhida',
                showFilterMenu: 'Mostrar Menu de Filtro',
                hideFilterMenu: 'Esconder Menu de Filtro',
                filterOperator: 'Operador de Filtro',
                filterConstraint: 'Restrição de Filtro',
                editRow: 'Editar Linha',
                saveEdit: 'Salvar Editar',
                cancelEdit: 'Cancelar Editar',
                listView: 'Visualização de Lista',
                gridView: 'Grade',
                slide: 'Deslizar',
                slideNumber: '{slideNumber}',
                zoomImage: 'Zoom Imagem',
                zoomIn: 'Zoom In',
                zoomOut: 'Zoom Out',
                rotateRight: 'Girar para Direita',
                rotateLeft: 'Girar para Esquerda'
            },
            startsWith: 'Começa com',
            contains: 'Contém',
            notContains: 'Não contém',
            endsWith: 'Termina com',
            equals: 'Igual',
            notEquals: 'Diferente',
            noFilter: 'Sem filtro',
            lt: 'Menor que',
            lte: 'Menor que ou igual a',
            gt: 'Maior que',
            gte: 'Maior que ou igual a',
            dateIs: 'Data é',
            dateIsNot: 'Data não é',
            dateBefore: 'Data é antes',
            dateAfter: 'Data é depois',
            clear: 'Limpar',
            apply: 'Aplicar',
            matchAll: 'Correspondência Todos',
            matchAny: 'Correspondência Qualquer',
            addRule: 'Adicionar Regra',
            removeRule: 'Remover Regra',
            accept: 'Sim',
            reject: 'Não',
            choose: 'Escolher',
            upload: 'Upload',
            cancel: 'Cancelar',
            completed: 'Concluído',
            pending: 'Pendente',
            fileSizeTypes: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        }
    })
    .use(Vue3Toastify, {
    autoClose: 3000,
    position: 'top-center',
    theme: 'dark'
    })
    .mount('#app')
