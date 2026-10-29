// server.js has side effects (it listens on a port), so its dependencies are mocked
jest.mock('../src/app');
jest.mock('../src/repositories/inMemoryProductRepository');
jest.mock('../src/repositories/jsonFileProductRepository');

describe('server bootstrap', () => {
  const env = process.env;
  let createApp; let InMemory; let JsonFile; let listen;

  const start = () => {
    jest.isolateModules(() => {
      createApp = require('../src/app');
      InMemory = require('../src/repositories/inMemoryProductRepository');
      JsonFile = require('../src/repositories/jsonFileProductRepository');
      listen = jest.fn((port, cb) => cb());
      createApp.mockReturnValue({ listen });
      require('../src/server');
    });
  };

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.STORAGE;
    delete process.env.PORT;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { process.env = env; jest.restoreAllMocks(); });

  test('uses the JSON file repository by default', () => {
    start();
    expect(JsonFile).toHaveBeenCalledTimes(1);
    expect(InMemory).not.toHaveBeenCalled();
    expect(createApp).toHaveBeenCalledWith(JsonFile.mock.instances[0]);
  });

  test('uses the in-memory repository when STORAGE=memory', () => {
    process.env.STORAGE = 'memory';
    start();
    expect(InMemory).toHaveBeenCalledTimes(1);
    expect(JsonFile).not.toHaveBeenCalled();
    expect(createApp).toHaveBeenCalledWith(InMemory.mock.instances[0]);
  });

  test('listens on port 3000 by default and logs the URL', () => {
    start();
    expect(listen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(console.log).toHaveBeenCalledWith('Inventory system running at http://localhost:3000');
  });

  test('listens on the PORT environment variable when set', () => {
    process.env.PORT = '4567';
    start();
    expect(listen).toHaveBeenCalledWith('4567', expect.any(Function));
  });
});
