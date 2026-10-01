import "./styles.css";

const CLOUD_COUNT = 24;
const PURCHASE_BUTTON_LABEL = "buy with your agent";
const PURCHASE_BUTTON_FEEDBACK_MS = 2_000;

interface CloudLedger {
	purchases: Array<{
		cloud: {
			id: number;
		};
	}>;
	purchase_endpoint: string;
}

async function loadClouds(): Promise<void> {
	const grid = requireElement<HTMLElement>("#cloud-grid");
	try {
		const response = await fetch("/clouds", {
			headers: { accept: "application/json" },
		});
		if (!response.ok) {
			throw new Error(`Cloud ledger returned HTTP ${response.status}`);
		}
		const ledger = (await response.json()) as CloudLedger;
		const purchasedIds = new Set(ledger.purchases.map(({ cloud }) => cloud.id));
		renderClouds(grid, purchasedIds);
		enableAgentPurchaseButton(ledger);
	} catch (error) {
		console.error(error);
		grid.classList.add("cloud-grid--error");
		grid.textContent = "The clouds could not be loaded.";
	}
}

function renderClouds(
	container: HTMLElement,
	purchasedIds: ReadonlySet<number>,
): void {
	const fragment = document.createDocumentFragment();
	for (let number = 1; number <= CLOUD_COUNT; number += 1) {
		fragment.append(createCloudTile(number, purchasedIds.has(number)));
	}
	container.replaceChildren(fragment);
}

function createCloudTile(number: number, purchased: boolean): HTMLElement {
	const tile = document.createElement("article");
	tile.className = purchased ? "cloud cloud--purchased" : "cloud";

	const image = document.createElement("img");
	image.src = `/clouds/cloud-${String(number).padStart(2, "0")}.webp`;
	image.alt = purchased
		? `Cloud ${number}, already purchased`
		: `Cloud ${number}, available`;
	image.decoding = "async";
	image.loading = number <= 8 ? "eager" : "lazy";
	tile.appendChild(image);
	return tile;
}

function enableAgentPurchaseButton(ledger: CloudLedger): void {
	const button = requireElement<HTMLButtonElement>("#agent-purchase-button");
	const prompt = createAgentPurchasePrompt(ledger.purchase_endpoint);
	button.disabled = false;
	button.addEventListener("click", () => {
		void copyAgentPurchasePrompt(button, prompt);
	});
}

function createAgentPurchasePrompt(purchaseEndpoint: string): string {
	return `buy me one cloud from the cloud website at ${purchaseEndpoint}.
check that I have enough USDC on base; if not, ask me to fund it. call the endpoint, handle its HTTP 402 challenge, and retry with the correct x402 payment header.
after purchase, render the cloud image inline and report the cloud ID and amount paid.

to render the image inline, use whatever works best in your environment — good options include downloading it to a local temp file via a JS eval cell (fetch + Bun.write) then reading the local path, a markdown image link, or display() with a base64 data URL.`;
}

async function copyAgentPurchasePrompt(
	button: HTMLButtonElement,
	prompt: string,
): Promise<void> {
	button.disabled = true;
	try {
		await writeTextToClipboard(prompt);
		showPurchaseButtonFeedback(button, "prompt copied");
	} catch (error) {
		console.error("Could not copy the agent purchase prompt", error);
		showPurchaseButtonFeedback(button, "copy failed");
	}
}

async function writeTextToClipboard(text: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
		return;
	} catch {
		const activeElement =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.readOnly = true;
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		const copied = document.execCommand("copy");
		textarea.remove();
		activeElement?.focus();
		if (!copied) {
			throw new Error("Clipboard access was denied");
		}
	}
}

function showPurchaseButtonFeedback(
	button: HTMLButtonElement,
	message: string,
): void {
	button.textContent = message;
	window.setTimeout(() => {
		button.textContent = PURCHASE_BUTTON_LABEL;
		button.disabled = false;
	}, PURCHASE_BUTTON_FEEDBACK_MS);
}

function requireElement<ElementType extends Element>(
	selector: string,
): ElementType {
	const element = document.querySelector<ElementType>(selector);
	if (element === null) {
		throw new Error(`Missing required element: ${selector}`);
	}
	return element;
}

void loadClouds();
