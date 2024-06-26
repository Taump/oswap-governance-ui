import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useParams } from "react-router-dom";
import { message } from "antd";
import obyte from "obyte";
import { Helmet } from "react-helmet-async";

import { selectActivePool, selectActivePoolLoadingStatus, selectPools, selectPoolsLoadingStatus } from "store/slices/poolsSlice";
import { WalletBalance } from "components/WalletBalance/WalletBalance";
import { GovernanceList } from "components/GovernanceList";
import { SelectPool } from "components/SelectPool/SelectPool";
import { Spin } from "components/Spin/Spin";
import { PoolsList } from "components/PoolsList/PoolsList";

import { useQuery } from "hooks/useQuery";
import { changeWallet, selectWallet } from "store/slices/settingsSlice";
import { changeActivePool } from "store/thunks/changeActivePool";
import { useWindowSize } from "hooks/useWindowSize";

import styles from "./MainPage.module.css";
import { botCheck } from "utils/botCheck";

export const MainPage = () => {
  // hooks
  const status = useSelector(selectPoolsLoadingStatus);
  const activePool = useSelector(selectActivePool);
  const activePoolStatus = useSelector(selectActivePoolLoadingStatus);
  const activeWallet = useSelector(selectWallet);
  const pools = useSelector(selectPools);

  const isBot = botCheck();

  const params = useParams();

  const [inited, setInited] = useState(false);

  const query = useQuery();
  const dispatch = useDispatch();
  const location = useLocation();

  const [width] = useWindowSize();

  const moveToNewLine = width < 990;

  const { pool } = params;

  useEffect(() => {
    if (status === "loaded") {
      if (pool && pool !== activePool?.address) {
        if (obyte.utils.isValidAddress(pool)) {
          if (pool in pools) {
            dispatch(changeActivePool(pool));
          } else {
            message.error({ content: "Pool not found!", duration: 5 })
          }
        } else {
          message.error({ content: "Pool address is invalid", duration: 5 })
        }
      }

      if (!inited) {

        const wallet = query.get('wallet');

        if (wallet && obyte.utils.isValidAddress(wallet)) {
          dispatch(changeWallet(wallet));
        } else if (wallet) {
          message.error({ content: "Wallet address is invalid" })
        }

        setInited(true);
      }
    }
  }, [status, pool]);

  if (status === "loading" && !isBot) return <div className={styles.dataLoaderWrap}><Spin size="large" /></div>

  return <div>
    {activePool?.address ? <Helmet>
      <meta property="og:title" content={`Oswap.io governance | Change parameters of ${activePool?.x_symbol} - ${activePool?.y_symbol}`} data-rh="true" />
      <title>Oswap.io governance | Change parameters of {activePool?.x_symbol} - {activePool?.y_symbol}</title>
    </Helmet> : <Helmet><title>Oswap.io governance</title><meta property="og:title" content="Oswap.io governance" data-rh="true" /></Helmet>}

    {location.pathname !== "/" ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40, flexDirection: moveToNewLine ? "column" : "row", backgroundColor: !moveToNewLine ? "#24292F" : "transparent", borderRadius: 25 }}>
      <SelectPool disabled={activePoolStatus === "loading"} styles={{ width: `${moveToNewLine ? 100 : 90}%` }} />
      <div style={{ width: moveToNewLine ? "100%" : "15%", paddingRight: 15, textAlign: "center" }}>
        <a target="_blank" rel="noopener" href={activePool?.address ? `${process.env.REACT_APP_STATS_LINK}/pool/${activePool.address}` : process.env.REACT_APP_STATS_LINK}>
          View stats
        </a>
      </div>
    </div> : <div>
      <h1 style={{ textAlign: "center" }}>Oswap governance</h1>
      <PoolsList />
    </div>}

    {activePoolStatus === "loading" && <div className={styles.poolLoaderWrap}><Spin size="large" /></div>}

    {activePoolStatus === "loaded" && <>
      <WalletBalance />

      <div className={styles.changeParamsWrap}>
        <h1>Change parameters of {activePool?.x_symbol} - {activePool?.y_symbol}</h1>

        <GovernanceList
          paramsInfo={activePool?.paramsInfo}
          activeGovernance={activePool?.governance_aa}
          voteTokenDecimals={activePool?.voteTokenDecimals}
          voteTokenSymbol={activePool?.voteTokenSymbol}
          voteTokenAddress={activePool?.voteTokenAddress}
          freeze_period={activePool?.freeze_period}
          challenging_period={activePool?.challenging_period}
          activeWallet={activeWallet}
          balance={activePool?.balances[activeWallet]}
          governance_state={activePool?.governance_state}
          poolDefParams={activePool?.poolDefParams}
          mid_price_decimals={activePool?.mid_price_decimals}
          x_symbol={activePool?.x_symbol}
          y_symbol={activePool?.y_symbol}
        />
      </div>
    </>}
  </div>
}
