<script setup>
import { ref, reactive } from 'vue';
import axios from 'axios'
import { format, differenceInMinutes, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'vue3-toastify';

const isLoading = ref(false);
const searchType = ref('identifier'); // 'identifier' | 'plate'

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

const calcularTarifa = (entrada, saida, tipo) => {
	const start = parse(entrada, 'dd/MM/yyyy HH:mm:ss', new Date(), { locale: ptBR });
	const end = parse(saida, 'dd/MM/yyyy HH:mm:ss', new Date(), { locale: ptBR });
	const diffMinutes = differenceInMinutes(end, start);

	const params = paramsTarifa[tipo.toLowerCase()]

	if (diffMinutes <= 10) {
		return 0
	}
	else {
		const diasCheio = parseInt(diffMinutes / (24 * 60))
		const valorDiasCheio = diasCheio * params.total

		const quinzenasFaltantes = parseInt((diffMinutes % (24 * 60) / 15))
		const valorParcial = quinzenasFaltantes * params.quinzena

		const valorTotal = valorDiasCheio + (valorParcial > 70 ? 70 : valorParcial)

		return valorTotal
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

			if (data) {
				ticket.value = {
					idrtdb: idrtdb,
					identifier: data.id,
					plate: data.placa,
					entryDate: data.data_entrada,
					exitDate: data.data_saida || null,
					processed: data.processado,
					tipo: data.tipo,
					tarifa: data.data_saida ? calcularTarifa(data.data_entrada, data.data_saida, data.tipo) : null
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

const handleCloseTicket = async () => {
	try {
		isLoading.value = true

		const dhNow = format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })

		const operationResponse = await axios.patch(
			`https://estapar-x12-default-rtdb.firebaseio.com/registros/${ticket.value.idrtdb}.json`,
			{
				data_saida: dhNow,
				processado: true
			}
		)

		if (operationResponse.status === 200) {
			ticket.value.exitDate = dhNow
			ticket.value.processed = true
			ticket.value.tarifa = calcularTarifa(ticket.value.entryDate, dhNow, ticket.value.tipo)

			toast.success('Dado processado com sucesso')
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
</script>

<template>
	<div class="flex items-center justify-center min-h-screen bg-secondary-950 font-body text-text-light p-4">
		<div class="w-full max-w-md bg-secondary-900 p-4 sm:p-8 rounded-xl shadow-2xl border border-secondary-800">
			<h1 class="text-2xl sm:text-3xl font-heading font-bold text-center mb-6 sm:mb-8 text-primary-400">
				Estapar X12
			</h1>

			<!-- Search Form -->
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
							<span class="block text-xs text-secondary-400 uppercase tracking-wider">Identificador</span>
							<span class="text-lg font-mono text-primary-300">{{ ticket.identifier }}</span>
						</div>
						<div>
							<span class="block text-xs text-secondary-400 uppercase tracking-wider">Placa</span>
							<span class="text-lg font-mono text-primary-300">{{ ticket.plate }}</span>
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
								{{ ticket.entryDate }}
							</div>
						</div>
						<div v-if="ticket.exitDate">
							<label class="block text-sm font-medium text-secondary-300 mb-1">Data de Saída</label>
							<div
								class="text-xl text-text-light font-medium bg-secondary-950 px-3 py-2 rounded border border-secondary-700">
								{{ ticket.exitDate }}
							</div>
						</div>
						<div v-if="ticket.tarifa !== null && ticket.tarifa !== undefined">
							<label class="block text-sm font-medium text-secondary-300 mb-1">Valor a Pagar</label>
							<div
								class="text-2xl text-green-400 font-bold bg-secondary-950 px-3 py-2 rounded border border-green-900/30">
								{{ ticket.tarifa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
							</div>
						</div>
					</div>
				</div>

				<button :disabled="isLoading || ticket.exitDate" @click="handleCloseTicket" :class="[
					'w-full font-bold py-3 px-4 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2',
					ticket.exitDate
						? 'bg-secondary-800 text-secondary-500 cursor-not-allowed border border-secondary-700'
						: 'bg-accent-600 hover:bg-accent-500 text-white hover:shadow-accent-500/20'
				]">
					<span>{{ ticket.exitDate ? 'TICKET JÁ FECHADO' : 'FECHAR TICKET' }}</span>
					<i :class="[
						'pi text-lg',
						ticket.exitDate ? 'pi-lock' : 'pi-check'
					]"></i>
				</button>

				<button @click="resetSearch"
					class="w-full text-secondary-400 hover:text-text-light text-sm transition-colors">
					Voltar para busca
				</button>
			</div>
		</div>
	</div>
</template>

<style></style>
