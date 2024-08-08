import * as assert from 'assert';
import { DataManager } from '../datamanager';
import mock from 'mock-fs';

suite('DataManager Test Suite', () => {

    setup(async () => {
        mock({
            'TestItem': 'This is a test item file.' // Mock the TestItem file
        });

        const dataManager = await DataManager.getInstance();
        // Reset the data by parsing an empty JSON object
        await dataManager.fromJson('{}');
    });

    test('Singleton instance test', async () => {
        const instance1 = await DataManager.getInstance();
        const instance2 = await DataManager.getInstance();
        assert.strictEqual(instance1, instance2, 'DataManager should return the same instance');
    });

    test('Add and get categories', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        const categories = await dataManager.getCategories();
        assert.strictEqual(categories.includes('TestCategory'), true, 'Category should be added');
    });

    test('Remove category', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.rmCategory('TestCategory');
        const categories = await dataManager.getCategories();
        assert.strictEqual(categories.includes('TestCategory'), false, 'Category should be removed');
    });

    test('Add and get items', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        const items = await dataManager.getItems('TestCategory');
        assert.strictEqual(items.includes('TestItem'), true, 'Item should be added');
    });

    test('Remove item', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        await dataManager.rmItem('TestCategory', 'TestItem');
        const items = await dataManager.getItems('TestCategory');
        assert.strictEqual(items.includes('TestItem'), false, 'Item should be removed');
    });

    test('Enable and disable category', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.enableCategory('TestCategory');
        let isEnabled = await dataManager.isCategoryEnabled('TestCategory');
        assert.strictEqual(isEnabled, true, 'Category should be enabled');
        await dataManager.disableCategory('TestCategory');
        isEnabled = await dataManager.isCategoryEnabled('TestCategory');
        assert.strictEqual(isEnabled, false, 'Category should be disabled');
    });

    test('Enable and disable item', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        await dataManager.enableItem('TestCategory', 'TestItem');
        let isEnabled = await dataManager.isItemEnabled('TestCategory', 'TestItem');
        assert.strictEqual(isEnabled, true, 'Item should be enabled');
        await dataManager.disableItem('TestCategory', 'TestItem');
        isEnabled = await dataManager.isItemEnabled('TestCategory', 'TestItem');
        assert.strictEqual(isEnabled, false, 'Item should be disabled');
    });

    test('Set and get token count', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        await dataManager.setTokenCount('TestCategory', 'TestItem', 5);
        const tokenCount = await dataManager.getTokenCount('TestCategory', 'TestItem');
        assert.strictEqual(tokenCount, 5, 'Token count should be set and retrieved');
    });

    test('Set and get dirty status', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        await dataManager.setDirty('TestCategory', 'TestItem', true);
        const isDirty = await dataManager.isDirty('TestCategory', 'TestItem');
        assert.strictEqual(isDirty, true, 'Dirty status should be set and retrieved');
    });

    test('Convert to and from JSON', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        const json = await dataManager.asJson();
        await dataManager.fromJson(json);
        const categories = await dataManager.getCategories();
        assert.strictEqual(categories.includes('TestCategory'), true, 'Data should be converted to and from JSON');
    });

    test('Check if category is enabled', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        let isEnabled = await dataManager.isCategoryEnabled('TestCategory');
        assert.strictEqual(isEnabled, true, 'Category should be enabled');
        await dataManager.disableCategory('TestCategory');
        isEnabled = await dataManager.isCategoryEnabled('TestCategory');
        assert.strictEqual(isEnabled, false, 'Category should be disabled');
    });

    test('Check if item is enabled', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        let isItemEnabled = await dataManager.isItemEnabled('TestCategory', 'TestItem');
        assert.strictEqual(isItemEnabled, true, 'Item should be enabled');
        await dataManager.disableItem('TestCategory', 'TestItem');
        isItemEnabled = await dataManager.isItemEnabled('TestCategory', 'TestItem');
        assert.strictEqual(isItemEnabled, false, 'Item should be disabled');
    });

    test('Convert data to JSON', async () => {
        const dataManager = await DataManager.getInstance();
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        const json = await dataManager.asJson();
        const expectedJson = JSON.stringify({
            'TestCategory': {
                metadata: {
                    enabled: true,
                    tokenCount: 0
                },
                items: {
                    'TestItem': {
                        metadata: {
                            enabled: true,
                            tokenCount: 0,
                            dirty: false
                        }
                    }
                }
            }
        }, null, 4);
        assert.strictEqual(json, expectedJson, 'The JSON representation should match the expected structure');
    });

    test('Parse data from JSON', async () => {
        const json = JSON.stringify({
            'TestCategory': {
                metadata: {
                    enabled: true,
                    tokenCount: 0
                },
                items: {
                    'TestItem': {
                        metadata: {
                            enabled: true,
                            tokenCount: 0,
                            dirty: false
                        }
                    }
                }
            }
        }, null, 4);
        const dataManager = await DataManager.getInstance();
        await dataManager.fromJson(json);
        const categories = await dataManager.getCategories();
        assert.strictEqual(categories.includes('TestCategory'), true, 'Category should be parsed from JSON');
        const items = await dataManager.getItems('TestCategory');
        assert.strictEqual(items.includes('TestItem'), true, 'Item should be parsed from JSON');
    });

    test('Event listener test', async () => {
        const dataManager = await DataManager.getInstance();
        let eventTriggered = false;

        dataManager.on('dataChanged', (data) => {
            eventTriggered = true;
        });

        await dataManager.addCategory('TestCategory');
        assert.strictEqual(eventTriggered, true, 'dataChanged event should be triggered when category is added');
    });

    test('Notify change on item addition', async () => {
        const dataManager = await DataManager.getInstance();
        let eventTriggered = false;

        dataManager.on('dataChanged', (data) => {
            eventTriggered = true;
        });

        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        assert.strictEqual(eventTriggered, true, 'dataChanged event should be triggered when item is added');
    });

    test('Notify change on item removal', async () => {
        const dataManager = await DataManager.getInstance();
        let eventTriggered = false;

        dataManager.on('dataChanged', (data) => {
            eventTriggered = true;
        });

        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');
        await dataManager.rmItem('TestCategory', 'TestItem');
        assert.strictEqual(eventTriggered, true, 'dataChanged event should be triggered when item is removed');
    });

    test('Set item enabled status', async () => {
        const dataManager = await DataManager.getInstance();

        // Setup: Add a category and an item
        await dataManager.addCategory('TestCategory');
        await dataManager.addItem('TestCategory', 'TestItem');

        // Initially, the item should be enabled
        let isEnabled = await dataManager.isItemEnabled('TestCategory', 'TestItem');
        assert.strictEqual(isEnabled, true, 'Item should be enabled initially');

        // Disable the item
        await dataManager.setItemEnabled('TestCategory', 'TestItem', false);
        isEnabled = await dataManager.isItemEnabled('TestCategory', 'TestItem');
        assert.strictEqual(isEnabled, false, 'Item should be disabled');

        // Enable the item again
        await dataManager.setItemEnabled('TestCategory', 'TestItem', true);
        isEnabled = await dataManager.isItemEnabled('TestCategory', 'TestItem');
        assert.strictEqual(isEnabled, true, 'Item should be enabled again');
    });

});
