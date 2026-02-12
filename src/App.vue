<script setup>
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios'
import { format, differenceInMinutes, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'vue3-toastify';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { FilterMatchMode } from '@primevue/core/api';

const isLoading = ref(false);
const searchType = ref('identifier'); // 'identifier' | 'plate'

const allRegistros = ref([])
const isListMode = ref(false);

const filters = ref({
	global: { value: null, matchMode: FilterMatchMode.CONTAINS },
	id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
	placa: { value: null, matchMode: FilterMatchMode.CONTAINS },
	tipo: { value: null, matchMode: FilterMatchMode.CONTAINS },
	dataEntrada: { value: null, matchMode: FilterMatchMode.CONTAINS },
	dataSaida: { value: null, matchMode: FilterMatchMode.CONTAINS },
	processado: { value: null, matchMode: FilterMatchMode.EQUALS }
});

const paramsTarifa = {
	carro: {
		inicial: 23,
		quinzena: 5,
		total: 70
	},
	moto: {
		inicial: 5,
		quinzena: 2,
		total: 25
	}
}

const searchForm = reactive({
	identifier: '',
	plate: ''
});

const ticket = ref(null);

const getAllRegistros = async () => {
	try {
		const result = await axios.get('https://estapar-x12-default-rtdb.firebaseio.com/registros.json')

		if (result.status === 200 && result.data) {
			allRegistros.value = Object.entries(result.data).map(([key, registro]) => {
				if (!registro) return null;
				return {
					idrtdb: key,
					id: registro.id,
					placa: registro.placa,
					tipo: registro.tipo,
					dataEntrada: registro.data_entrada,
					dataSaida: registro.data_saida,
					processado: registro.processado,
					valor: !registro.data_saida ? null : calcularTarifa(registro.data_entrada, registro.data_saida, registro.tipo)
				}
			}).filter(registro => registro !== null)
		}
	}
	catch (err) {
		toast.error(err.message)
	}
}

const calcularTarifa = (entrada, saida, tipo) => {
	const start = parse(entrada, 'dd/MM/yyyy HH:mm:ss', new Date(), { locale: ptBR });
	const end = parse(saida, 'dd/MM/yyyy HH:mm:ss', new Date(), { locale: ptBR });
	const diffMinutes = differenceInMinutes(end, start);

	const params = paramsTarifa[tipo.toLowerCase()]

	if (diffMinutes <= 10) {
		return 0
	}
	else if (diffMinutes <= 60) {
		return params.inicial
	}
	else {
		const diffMinutesAdaptado = diffMinutes - 60

		const diasCheio = parseInt(diffMinutesAdaptado / (24 * 60))
		const valorDiasCheio = diasCheio * params.total

		const quinzenasFaltantes = parseInt((diffMinutesAdaptado % (24 * 60) / 15))
		const valorParcial = quinzenasFaltantes * params.quinzena

		const valorParcialAdaptado = valorParcial > params.total ? params.total : valorParcial

		const valorTotal = valorDiasCheio + valorParcialAdaptado

		return valorTotal + params.inicial + params.quinzena
	}
}

const handleSearch = async () => {
	try {
		// Validate based on search type
		if (searchType.value === 'identifier' && !searchForm.identifier) {
			throw {
				message: 'Por favor, informe o identificador.'
			}
		}

		if (searchType.value === 'plate' && !searchForm.plate) {
			throw {
				message: 'Por favor, informe a placa.'
			}
		}

		isLoading.value = true;

		const url = searchType.value === 'identifier' ?
			`https://estapar-x12-default-rtdb.firebaseio.com/registros.json?orderBy="id"&equalTo="${searchForm.identifier}"` :
			`https://estapar-x12-default-rtdb.firebaseio.com/registros.json?orderBy="placa"&equalTo="${searchForm.plate}"`

		const ticketResponse = await axios.get(url)

		if (ticketResponse.status === 200) {
			const idrtdb = Object.keys(ticketResponse.data)[0]
			const [data] = Object.values(ticketResponse.data);
			const dhNow = format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });

			if (data) {
				ticket.value = {
					idrtdb: idrtdb,
					id: data.id,
					placa: data.placa,
					dataEntrada: data.data_entrada,
					dataSaida: data.data_saida || null,
					processado: data.processado,
					tipo: data.tipo,
					tarifa: data.data_saida ?
						calcularTarifa(data.data_entrada, data.data_saida, data.tipo) :
						calcularTarifa(data.data_entrada, dhNow, data.tipo),
					dataCalculo: data.data_saida ? null : dhNow
				};
			}
			else {
				throw {
					message: 'Nenhum dado encontrado para esses filtros'
				}
			}
		}
	}
	catch (err) {
		toast.error(err.message)
	}
	finally {
		isLoading.value = false;
	}
};

const handleCloseTicketInTable = async (ticketData) => {
	const dhNow = format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })

	ticket.value = {
		idrtdb: ticketData.idrtdb,
		id: ticketData.id,
		placa: ticketData.placa,
		dataEntrada: ticketData.dataEntrada,
		dataSaida: ticketData.dataSaida || null,
		processado: ticketData.processado,
		tipo: ticketData.tipo,
		tarifa: ticketData.dataSaida ?
			calcularTarifa(ticketData.dataEntrada, ticketData.dataSaida, ticketData.tipo) :
			calcularTarifa(ticketData.dataEntrada, dhNow, ticketData.tipo),

		dataCalculo: ticketData.dataSaida ? null : dhNow
	};

	isListMode.value = false
}

const handleCloseTicket = async (ticketData = null) => {
	try {
		const targetTicket = ticketData || ticket.value;
		if (!targetTicket) return;

		isLoading.value = true

		const dhNow = format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })

		const novoValor = calcularTarifa(targetTicket.dataEntrada, dhNow, targetTicket.tipo)

		if (novoValor !== targetTicket.tarifa) {
			return toast.error('O valor estimado já não é mais aceito para esse horário')
		}

		const operationResponse = await axios.patch(
			`https://estapar-x12-default-rtdb.firebaseio.com/registros/${targetTicket.idrtdb}.json`,
			{
				data_saida: dhNow,
				processado: true
			}
		)

		if (operationResponse.status === 200) {
			ticket.value.dataSaida = dhNow
			ticket.value.processado = true
			ticket.value.tarifa = novoValor

			getAllRegistros()

			toast.success('Ticket finalizado com sucesso')
		}
	}
	catch (err) {
		toast.error(err.message)
	}
	finally {
		isLoading.value = false
	}
};

const resetSearch = () => {
	ticket.value = null;
	searchForm.identifier = '';
	searchForm.plate = '';
};

onMounted(() => {
	getAllRegistros()
})
</script>

<template>
	<div class="flex items-center justify-center min-h-screen bg-secondary-950 font-body text-text-light p-4">
		<div :class="[
			'w-full bg-secondary-900 p-4 sm:p-8 rounded-xl shadow-2xl border border-secondary-800 transition-all duration-300',
			isListMode ? 'max-w-4xl' : 'max-w-md'
		]">
			<div class="flex justify-between items-center mb-6 sm:mb-8">
				<h1 class="text-2xl sm:text-3xl font-heading font-bold text-primary-400">
					Estapar
				</h1>
				<Button :icon="isListMode ? 'pi pi-search' : 'pi pi-list'"
					:label="isListMode ? 'Voltar para Busca' : 'Ver Lista'" @click="isListMode = !isListMode"
					class="p-button-text text-primary-400 hover:text-primary-300 transition-colors"
					v-tooltip.bottom="isListMode ? 'Voltar para Busca' : 'Ver Lista de Registros'" />
			</div>

			<!-- List Mode View -->
			<div v-if="isListMode" class="card">
				<DataTable :value="allRegistros" paginator :rows="5" :rowsPerPageOptions="[5, 10]"
					tableStyle="min-width: 50rem"
					paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
					currentPageReportTemplate="{first} a {last} de {totalRecords}" v-model:filters="filters"
					filterDisplay="row" :globalFilterFields="['id', 'placa', 'tipo']"
					class="p-datatable-sm bg-transparent custom-table">
					<template #header>
						<div class="flex justify-end">
							<span class="p-input-icon-left">
								<i class="pi pi-search mr-2" />
								<InputText v-model="filters['global'].value" placeholder="Pesquisar..."
									class="bg-secondary-950 text-text-light border-secondary-700" />
							</span>
						</div>
					</template>
					<Column header="Ações" style="width: 5rem; text-align: center"
						bodyStyle="text-align: center; overflow: visible">
						<template #body="slotProps">
							<Button v-if="!slotProps.data.processado" icon="pi pi-check"
								class="p-button-rounded p-button-success p-button-text hover:bg-green-900/20"
								v-tooltip.top="'Finalizar Ticket'" @click="handleCloseTicketInTable(slotProps.data)"
								:disabled="isLoading" />
							<i v-else class="pi pi-check-circle text-green-500 text-xl"></i>
						</template>
					</Column>
					<Column field="id" header="ID"></Column>
					<Column field="placa" header="Placa"></Column>
					<Column field="tipo" header="Tipo"></Column>
					<Column field="dataEntrada" header="Entrada"></Column>
					<Column field="dataSaida" header="Saída">
						<template #body="slotProps">
							{{ slotProps.data.dataSaida || '-' }}
						</template>
					</Column>
					<Column field="processado" header="Processado">
						<template #body="slotProps">
							<i :class="[
								'pi',
								slotProps.data.processado ? 'pi-check-circle text-green-500' : 'pi-times-circle text-red-500'
							]"></i>
						</template>
					</Column>
					<Column field="valor" header="Valor">
						<template #body="slotProps">
							{{ slotProps.data.valor !== null ? slotProps.data.valor.toLocaleString('pt-BR', {
								style:
									'currency', currency: 'BRL'
							}) : '-' }}
						</template>
					</Column>
				</DataTable>
			</div>

			<!-- Search Form -->
			<div v-else>
				<div v-if="!ticket" class="space-y-4 sm:space-y-6">
					<!-- Toggle Switch -->
					<div class="flex p-1 bg-secondary-950 rounded-lg border border-secondary-800">
						<button @click="searchType = 'identifier'" :class="[
							'flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200',
							searchType === 'identifier'
								? 'bg-secondary-800 text-primary-400 shadow-sm'
								: 'text-secondary-400 hover:text-secondary-200'
						]">
							Identificador
						</button>

						<button @click="searchType = 'plate'" :class="[
							'flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200',
							searchType === 'plate'
								? 'bg-secondary-800 text-primary-400 shadow-sm'
								: 'text-secondary-400 hover:text-secondary-200'
						]">
							Placa
						</button>
					</div>

					<div v-if="searchType === 'identifier'" class="space-y-2">
						<label for="identifier" class="block text-sm font-medium text-secondary-300">
							Identificador
						</label>

						<input id="identifier" v-model="searchForm.identifier" type="text" autocomplete="off"
							placeholder="Digite o identificador"
							class="w-full px-4 py-3 rounded-lg bg-secondary-950 border border-secondary-700 text-text-light focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-secondary-600" />
					</div>

					<div v-if="searchType === 'plate'" class="space-y-2">
						<label for="plate" class="block text-sm font-medium text-secondary-300">
							Placa
						</label>

						<input id="plate" v-model="searchForm.plate" type="text" placeholder="Digite a placa"
							autocomplete="off"
							class="w-full px-4 py-3 rounded-lg bg-secondary-950 border border-secondary-700 text-text-light focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-secondary-600" />
					</div>

					<button @click="handleSearch" :disabled="isLoading"
						class="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-primary-600/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg hover:shadow-primary-500/20 flex items-center justify-center gap-2">
						<span v-if="isLoading">
							<i class="pi pi-spinner pi-spin text-white text-xl"></i>
						</span>

						<span>
							{{ isLoading ? 'BUSCANDO...' : 'BUSCAR TICKET' }}
						</span>
					</button>
				</div>

				<!-- Ticket Result / Close Form -->
				<div v-else class="space-y-4 sm:space-y-6">
					<div class="p-4 bg-secondary-950/50 rounded-lg border border-secondary-800 space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<span
									class="block text-xs text-secondary-400 uppercase tracking-wider">Identificador</span>
								<span class="text-lg font-mono text-primary-300">{{ ticket.id }}</span>
							</div>
							<div>
								<span class="block text-xs text-secondary-400 uppercase tracking-wider">Placa</span>
								<span class="text-lg font-mono text-primary-300">{{ ticket.placa }}</span>
							</div>
						</div>

						<div class="pt-4 border-t border-secondary-800 grid grid-cols-1 gap-4">
							<div>
								<label class="block text-sm font-medium text-secondary-300 mb-1">Tipo de veículo</label>
								<div
									class="text-xl text-text-light font-medium bg-secondary-950 px-3 py-2 rounded border border-secondary-700">
									{{ ticket.tipo }}
								</div>
							</div>
							<div>
								<label class="block text-sm font-medium text-secondary-300 mb-1">Data de Entrada</label>
								<div
									class="text-xl text-text-light font-medium bg-secondary-950 px-3 py-2 rounded border border-secondary-700">
									{{ ticket.dataEntrada }}
								</div>
							</div>
							<div v-if="ticket.dataSaida">
								<label class="block text-sm font-medium text-secondary-300 mb-1">Data de Saída</label>
								<div
									class="text-xl text-text-light font-medium bg-secondary-950 px-3 py-2 rounded border border-secondary-700">
									{{ ticket.dataSaida }}
								</div>
							</div>
							<div v-if="ticket.tarifa !== null && ticket.tarifa !== undefined">
								<label class="block text-sm font-medium text-secondary-300 mb-1">
									{{ ticket.dataSaida ? 'Valor a Pagar' : 'Valor Estimado' }}
								</label>
								<div
									class="text-2xl text-green-400 font-bold bg-secondary-950 px-3 py-2 rounded border border-green-900/30">
									{{ ticket.tarifa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
								</div>
								<div v-if="ticket.dataCalculo && !ticket.processado"
									class="text-xs text-secondary-400 mt-1 text-right">
									Calculado em {{ ticket.dataCalculo }}
								</div>
							</div>
						</div>
					</div>

					<button :disabled="isLoading || ticket.dataSaida" @click="handleCloseTicket()" :class="[
						'w-full font-bold py-3 px-4 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2',
						ticket.dataSaida
							? 'bg-secondary-800 text-secondary-500 cursor-not-allowed border border-secondary-700'
							: 'bg-accent-600 hover:bg-accent-500 text-white hover:shadow-accent-500/20'
					]">
						<span>{{ ticket.dataSaida ? 'TICKET JÁ FECHADO' : 'FECHAR TICKET' }}</span>
						<i :class="[
							'pi text-lg',
							ticket.dataSaida ? 'pi-lock' : 'pi-check'
						]"></i>
					</button>

					<button @click="resetSearch"
						class="w-full text-secondary-400 hover:text-text-light text-sm transition-colors">
						Voltar para busca
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style>
.custom-table .p-datatable-header,
.custom-table .p-datatable-thead>tr>th,
.custom-table .p-datatable-tbody>tr>td,
.custom-table .p-datatable-footer {
	background-color: transparent !important;
	color: var(--color-text-light) !important;
	border-color: #1f2937 !important;
	/* secondary-800 */
}

.custom-table .p-datatable-thead>tr>th {
	color: #9ca3af !important;
	/* secondary-400 */
	font-weight: 600;
}

.custom-table .p-datatable-tbody>tr {
	background-color: transparent !important;
	color: #f3f4f6 !important;
	/* text-light/secondary-100 */
}

.custom-table .p-paginator {
	background-color: transparent !important;
	color: #9ca3af !important;
	border-top: 1px solid #1f2937 !important;
}

.custom-table .p-paginator .p-paginator-pages .p-paginator-page {
	color: #9ca3af;
}

.custom-table .p-paginator .p-paginator-pages .p-paginator-page.p-highlight {
	background-color: #3730a3 !important;
	/* primary-800 */
	color: white;
}
</style>
