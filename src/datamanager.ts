interface Metadata {
    enabled: boolean;
    tokenCount: number;
    dirty?: boolean;
}

interface Item {
    metadata: Metadata;
}

interface Category {
    metadata: Metadata;
    items: { [key: string]: Item };
}

interface Data {
    [key: string]: Category;
}

export class DataManager {
    private static instance: DataManager | null = null;
    private static initializationPromise: Promise<DataManager> | null = null;
    private data: Data;

    private constructor() {
        this.data = {};
    }

    public static async getInstance(): Promise<DataManager> {
        if (!DataManager.instance) {
            if (!DataManager.initializationPromise) {
                DataManager.initializationPromise = DataManager.initialize().catch(error => {
                    DataManager.initializationPromise = null;
                    throw error;
                });
            }
            await DataManager.initializationPromise;
        }
        return DataManager.instance!;
    }

    private static async initialize(): Promise<DataManager> {
        try {
            // Simulate async initialization (e.g., loading data from storage)
            await new Promise(resolve => setTimeout(resolve, 100));

            DataManager.instance = new DataManager();
            // Perform any async initialization here
            // For example: await DataManager.instance.loadDataFromStorage();

            return DataManager.instance;
        } catch (error) {
            console.error('Failed to initialize DataManager:', error);
            throw new Error('DataManager initialization failed');
        }
    }

    public async addCategory(category: string): Promise<void> {
        try {
            if (this.data[category]) {
                throw new Error(`Category '${category}' already exists`);
            }
            this.data[category] = {
                metadata: {
                    enabled: true,
                    tokenCount: 0,
                },
                items: {},
            };
        } catch (error) {
            console.error(`Failed to add category '${category}':`, error);
            throw error;
        }
    }

    public async getCategories(): Promise<string[]> {
        try {
            return Object.keys(this.data).filter(key => key !== 'metadata');
        } catch (error) {
            console.error('Failed to get categories:', error);
            throw new Error('Failed to retrieve categories');
        }
    }

    public async rmCategory(category: string): Promise<void> {
        try {
            if (!(category in this.data)) {
                throw new Error(`Category '${category}' does not exist`);
            }
            delete this.data[category];
        } catch (error) {
            console.error(`Failed to remove category '${category}':`, error);
            throw error;
        }
    }

    public async addItem(category: string, item: string): Promise<void> {
        try {
            if (!(category in this.data)) {
                await this.addCategory(category);
            }
            if (this.data[category].items[item]) {
                throw new Error(`Item '${item}' already exists in category '${category}'`);
            }
            this.data[category].items[item] = {
                metadata: {
                    enabled: true,
                    tokenCount: 0,
                    dirty: false,
                },
            };
        } catch (error) {
            console.error(`Failed to add item '${item}' to category '${category}':`, error);
            throw error;
        }
    }

    public async rmItem(category: string, item: string): Promise<void> {
        try {
            if (!(category in this.data)) {
                throw new Error(`Category '${category}' does not exist`);
            }
            if (!(item in this.data[category].items)) {
                throw new Error(`Item '${item}' does not exist in category '${category}'`);
            }
            delete this.data[category].items[item];
        } catch (error) {
            console.error(`Failed to remove item '${item}' from category '${category}':`, error);
            throw error;
        }
    }

    public async getItems(category: string): Promise<string[]> {
        try {
            if (!(category in this.data)) {
                throw new Error(`Category '${category}' does not exist`);
            }
            return Object.keys(this.data[category].items);
        } catch (error) {
            console.error(`Failed to get items for category '${category}':`, error);
            throw error;
        }
    }

    public async enableCategory(category: string): Promise<void> {
        try {
            if (!(category in this.data)) {
                throw new Error(`Category '${category}' does not exist`);
            }
            this.data[category].metadata.enabled = true;
        } catch (error) {
            console.error(`Failed to enable category '${category}':`, error);
            throw error;
        }
    }

    public async disableCategory(category: string): Promise<void> {
        try {
            if (!(category in this.data)) {
                throw new Error(`Category '${category}' does not exist`);
            }
            this.data[category].metadata.enabled = false;
        } catch (error) {
            console.error(`Failed to disable category '${category}':`, error);
            throw error;
        }
    }

    public async enableItem(category: string, item: string): Promise<void> {
        try {
            this.checkCategoryAndItemExist(category, item);
            this.data[category].items[item].metadata.enabled = true;
        } catch (error) {
            console.error(`Failed to enable item '${item}' in category '${category}':`, error);
            throw error;
        }
    }

    public async disableItem(category: string, item: string): Promise<void> {
        try {
            this.checkCategoryAndItemExist(category, item);
            this.data[category].items[item].metadata.enabled = false;
        } catch (error) {
            console.error(`Failed to disable item '${item}' in category '${category}':`, error);
            throw error;
        }
    }

    public async setTokenCount(category: string, item: string, count: number): Promise<void> {
        try {
            this.checkCategoryAndItemExist(category, item);
            if (count < 0) {
                throw new Error('Token count cannot be negative');
            }
            this.data[category].items[item].metadata.tokenCount = count;
        } catch (error) {
            console.error(`Failed to set token count for item '${item}' in category '${category}':`, error);
            throw error;
        }
    }

    public async getTokenCount(category: string, item: string): Promise<number> {
        try {
            this.checkCategoryAndItemExist(category, item);
            return this.data[category].items[item].metadata.tokenCount;
        } catch (error) {
            console.error(`Failed to get token count for item '${item}' in category '${category}':`, error);
            throw error;
        }
    }

    public async setDirty(category: string, item: string, dirty: boolean): Promise<void> {
        try {
            this.checkCategoryAndItemExist(category, item);
            this.data[category].items[item].metadata.dirty = dirty;
        } catch (error) {
            console.error(`Failed to set dirty status for item '${item}' in category '${category}':`, error);
            throw error;
        }
    }

    public async isDirty(category: string, item: string): Promise<boolean> {
        try {
            this.checkCategoryAndItemExist(category, item);
            return this.data[category].items[item].metadata.dirty || false;
        } catch (error) {
            console.error(`Failed to get dirty status for item '${item}' in category '${category}':`, error);
            throw error;
        }
    }

    public async asJson(): Promise<string> {
        try {
            return JSON.stringify(this.data, null, 4);
        } catch (error) {
            console.error('Failed to convert data to JSON:', error);
            throw new Error('Failed to convert data to JSON');
        }
    }

    public async fromJson(json: string): Promise<void> {
        try {
            this.data = JSON.parse(json);
        } catch (error) {
            console.error('Failed to parse JSON data:', error);
            throw new Error('Failed to parse JSON data');
        }
    }

    private checkCategoryAndItemExist(category: string, item: string): void {
        if (!(category in this.data)) {
            throw new Error(`Category '${category}' does not exist`);
        }
        if (!(item in this.data[category].items)) {
            throw new Error(`Item '${item}' does not exist in category '${category}'`);
        }
    }
}