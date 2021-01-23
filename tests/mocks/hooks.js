import {jest} from '@jest/globals';

global.Hooks = {
  call: jest.fn(),
  callAll: jest.fn(),
  on: jest.fn(),
  once: jest.fn()
}