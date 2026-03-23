import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import http from "services/http";
import client from "services/obyte"

import { botCheck } from "utils/botCheck";


export const loadPools = createAsyncThunk(
  'get/loadPools',
  async () => {
    // load pools
    const isBot = botCheck();

    const factoryAddresses = process.env.REACT_APP_FACTORY_AA
      .split(",")
      .map(addr => addr.trim())
      .filter(Boolean);

    const factoryResults = await Promise.all(
      factoryAddresses.map(factoryAddr => {
        if (isBot) {
          return http.getStateVars(factoryAddr);
        } else {
          return client.api.getAaStateVars({ address: factoryAddr });
        }
      })
    );

    let stateVars = {};
    for (const result of factoryResults) {
      Object.assign(stateVars, result);
    }

    // get token registry AA
    const tokenRegistry = client.api.getOfficialTokenRegistryAddress();

    // prepare data and load symbols
    const pools = {};
    const getSymbols = [];
    const getSwapFee = [];

    const tvlGetter = axios.get(`${process.env.REACT_APP_STATS_LINK}/api/v1/yield`).then(({ data = [] }) => {
      data.forEach(({ address, tvlUsd }) => {
        if (address in pools) {
          pools[address].tvl = tvlUsd;
        } else {
          console.log('log(tvl): address isn\'t found', address);
        }
      });
    });

    Object.keys(stateVars).forEach(name => {
      if (!name.startsWith("pool_")) return;
      const address = name.split("_")[1];
      const params = stateVars[name];

      pools[address] = Object.assign({}, params);

      if (isBot) {
        getSymbols.push(
          http.getSymbolByAsset(tokenRegistry, params.x_asset).then((x_symbol) => pools[address].x_symbol = x_symbol),
          http.getSymbolByAsset(tokenRegistry, params.y_asset).then((y_symbol) => pools[address].y_symbol = y_symbol),
        )

        getSwapFee.push(
          http.executeGetter(address, "get_swap_fee").then(({ result }) => pools[address].swap_fee = result),
        )
      } else {
        getSymbols.push(
          client.api.getSymbolByAsset(tokenRegistry, params.x_asset).then((x_symbol) => pools[address].x_symbol = x_symbol),
          client.api.getSymbolByAsset(tokenRegistry, params.y_asset).then((y_symbol) => pools[address].y_symbol = y_symbol),
        );

        getSwapFee.push(
          client.api.executeGetter({ address, getter: "get_swap_fee" }).then(({ result }) => pools[address].swap_fee = result),
        )
      }
    })

    await Promise.all([...getSymbols, ...getSwapFee, tvlGetter]);

    return pools;
  });
