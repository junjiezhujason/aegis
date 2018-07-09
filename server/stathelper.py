#!/usr/bin/env python3
#title           :stathelper.py
#description     :helper functions for hypothesis testing
#author          :Junjie Zhu
#date            :20180408
#version         :0.1
#usage           :
#notes           :
#python_version  :3.6.0
#==============================================================================

import logging
import numpy as np
import itertools as it
import scipy.stats as stats

logger = logging.getLogger(__name__)

def assert_max(var, val):
    return "Maximum {} allowed: {}".format(var, val)

def assert_min(var, val):
    return "Minimum {} allowed: {}".format(var, val)

def global_test_pvalue(pvals, method="Simes"):
    # order the p-values
    n = len(pvals)
    if method == "Simes":
        pvals_ordered = np.array(sorted(pvals))
        multiply_factor = n / (1 + np.arange(n))
        global_pvalue =  np.min(pvals_ordered * multiply_factor)
    return global_pvalue

def multitest_rejections(raw_pvals, alpha, method="Bonferroni"):
    raw_pvals = np.array(raw_pvals) # numpy array
    n_tests = len(raw_pvals)
    # logger.info("Multi-test correction for {} hypotheses".format(n_tests))
    if method == "Bonferroni":
        adjust_pvals = raw_pvals  * n_tests
        reject_set = np.where( adjust_pvals < alpha )[0]
    if method == "BH":
        # estimates FDR by V(t) / max(R(t), 1) via threshold t
        # goal is to find the maximum t such that FDR(t) < alpha
        thresholds = np.sort(raw_pvals)
        V_t = thresholds * n_tests # estimate of false rejections
        R_t = np.arange(len(thresholds)) + 1 # number of rejections
        FDR_t = V_t / R_t
        valid_thresholds = FDR_t <= alpha
        if (np.sum(valid_thresholds) > 0):
            final_threshold = np.max(thresholds[valid_thresholds])
        else:
            final_threshold = 0
        reject_set = np.where( raw_pvals <= final_threshold )[0]
    return reject_set

class BaseSimulator(object):
    def __init__(self, n_regimes, n_reps, cache_dir=None):
        self.n_regimes = n_regimes
        self.n_reps = n_reps
        self.n_trials = n_regimes * n_reps
        self.regime_names = ["" for i in range(self.n_regimes)]
        self.trial_params = [[] for i in range(self.n_trials)]
        self.trial_summary = [[] for i in range(self.n_trials)]
        self.general_params = {} # problem specific parameters
        self.cache_dir = cache_dir

    def rrid_to_tid(self, i_regime, i_rep):
        assert i_regime < self.n_regimes, assert_max("regime", self.n_regimes-1)
        assert i_rep < self.n_reps, assert_max("replication", self.n_reps-1)
        # (regime, repetition) index to trial index
        return (i_regime * self.n_reps) + i_rep

    def tid_to_rrid(self, trial_id):
        assert trial_id < ( self.n_regimes * self.n_reps ), \
            assert_max("trial id", self.n_regimes * self.n_reps - 1 )
        # trial index to (regime, repetition) index
        i_regime = trial_id //  self.n_reps
        i_rep = trial_id % self.n_reps
        return (i_regime, i_rep)

    def generate_trial_gene_pvalues(self):
        # main system to generate the data trial by trial
        # the structure to paralleize the code can be completed here
        # always set the logger levels to debug when running jobs
        all_pvalues = []
        all_statistics = []
        for tid in range(self.n_trials):
            rr_info = self.tid_to_rrid(tid)
            params = self.trial_params[tid]
            logger.info("Generating data for regime {}, trial {}".format(*rr_info))
            logger.debug("Parameters:\n{}".format(params))
            # generate data
            trial_y, trial_X = self.generate_single_trial_data(params)
            # generate p-values
            statistic, pvalues = self.get_diff_stats_pvals(trial_y, trial_X)
            all_pvalues.append(pvalues)
            all_statistics.append(statistic)
        return all_staistics, all_pvalues

    def generate_single_trial_data(self, params):
        raise Exception ("Not Implemented")

    def setup_general_params(self):
        raise Exception ("Not Implemented")

    def setup_trial_params(self):
        raise Exception ("Not Implemented")


class OnewaySimulator(BaseSimulator):
    def __init__(self, n_regimes, n_reps):
        BaseSimulator.__init__(self, n_regimes, n_reps)

    def get_diff_stats_pvals(self, y_data, X_data):
        # test the difference between each covariate and
        # return Welch t-test p-value (not assuming equal variance)
        controls = X_data[y_data==0, :]
        cases = X_data[y_data==1, :]
        logger.debug("Number of cases and controls: ({}, {})".format(
            cases.shape[0], controls.shape[0]))
        result = stats.ttest_ind(controls, cases, axis=0, equal_var=False)
        statistic = result[0]
        pvalues = result[1]
        return statistic, pvalues

    def generate_single_trial_data(self, params):
        logger.debug("Generating under the '{}' model".format(params["model"]))
        np.random.seed(params["replicate"])
        X_data = []
        y_data = []
        for i, pop in enumerate(["controls", "cases"]):
            n_samples = params[("n_" + pop)]
            n_covars = params["n_covars"]
            if params["covar"] is None:
                # cov = np.identity(n_covars)
                mtx = np.random.normal(size=(n_samples, n_covars))
                if pop == "cases":
                    mtx[:, :params["n_sig_covars"]] = params["eff_size"]
            else:
                mean = np.zeros(n_covars)
                cov = params["covar"]
                if pop == "cases":
                    mean[:params["n_sig_covars"]] = params["eff_size"]
                mtx =  np.random.multivariate_normal(mean, cov, n_samples)
            logger.debug("{}: {}".format(pop, mtx.shape))
            X_data.append(mtx)
            y_data.append(np.repeat(i, n_samples))
        y_data = np.concatenate(y_data)
        X_data = np.concatenate(X_data, axis=0)
        return y_data, X_data

    def setup_sample_size_sweep(self,
                                min_n,
                                max_n,
                                n_covars,
                                n_sig_covars,
                                eff_size,
                                model="gaussian",
                                covar=None):
        # n_cases: number of cases
        # n_controls: number of controls
        # n_covars: number of covariates (n_covars > n_sigs)
        # n_sig_covars: number of signals (assumed to be 0 - (n_sigs-1))
        # max_eff_size: the maximum effect size

        assert min_n > 0,  assert_min("min sample size", 1)
        assert max_n > min_n, assert_min("max sample size", 1)
        assert n_covars >= n_sig_covars, assert_max("num. signals", n_covars)

        self.general_params = {
            "min_n" : min_n,
            "max_n": max_n,
            "n_covars" : n_covars,
            "n_sig_covars" : n_sig_covars,
            "eff_size" : eff_size,
            "model" : model,
            "covar" : covar
        }

        sweep = np.linspace(min_n, max_n, num=self.n_regimes).astype(int)
        self.regime_names = ["{}".format(s) for s in sweep]
        logger.info("Problem parameters: {}".format(self.general_params))
        logger.info("Regimes: {}".format(self.regime_names))
        # signal regimes is defined here by linearly varying signal strengths
        for i, j in it.product(range(self.n_regimes), range(self.n_reps)):
            params = self.general_params.copy()
            params.update({
                "regime": i,
                "replicate": j,
                "n_cases" : int(sweep[i]),
                "n_controls": int(sweep[i]),
            })
            self.trial_params[self.rrid_to_tid(i, j)] = params
        # return self.trial_params

    def setup_general_params(self,
                             n_controls,
                             n_cases,
                             n_covars,
                             n_sig_covars,
                             max_eff_size,
                             model="gaussian",
                             covar=None):
        # n_cases: number of cases
        # n_controls: number of controls
        # n_covars: number of covariates (n_covars > n_sigs)
        # n_sig_covars: number of signals (assumed to be 0 - (n_sigs-1))
        # max_eff_size: the maximum effect size

        assert n_cases > 0,  assert_min("number of cases", 1)
        assert n_controls > 0, assert_min("number of controls", 1)
        assert n_covars >= n_sig_covars, assert_max("num. signals", n_covars)
        if max_eff_size*np.sqrt(min(n_cases, n_controls)) < np.sqrt( 2 * np.log(n_covars) ):
            sugg_max_eff_size = 2 * np.sqrt( 2 * np.log(n_covars) )
            logger.warning("The max. eff. size {} ".format(max_eff_size) +
                "may be too weak to be detected. " +
                "We recommend: {}".format(sugg_max_eff_size))
        self.general_params = {
            "n_cases" : n_cases,
            "n_controls": n_controls,
            "n_covars" : n_covars,
            "n_sig_covars" : n_sig_covars,
            "max_eff_size" : max_eff_size,
            "model" : model,
            "covar" : covar
        }

    def setup_trial_params(self):
        # TODO: figure out the best way to integrate these arguments
        # with the base class setup_trial_params() function
        # under the gaussian model (and a sparse regime, n_sig_covars small),
        # we will assume unit noise variance, so we want to make sure
        # the minimum detection threshold is achieved
        max_eff_size = self.general_params["max_eff_size"]
        signals = np.linspace(0.0, max_eff_size, num=self.n_regimes)
        self.regime_names = ["{:.2f}".format(s) for s in signals]
        logger.info("Problem parameters: {}".format(self.general_params))
        logger.info("Signals (effect sizes): {}".format(signals))
        # signal regimes is defined here by linearly varying signal strengths
        for i, j in it.product(range(self.n_regimes), range(self.n_reps)):
            params = self.general_params.copy()
            params.update({
                "regime": i,
                "replicate": j,
                "eff_size": signals[i],
            })
            self.trial_params[self.rrid_to_tid(i, j)] = params
        # return self.trial_params



class StatHelper(object):
    def __init__(self):
        self.n_hypotheis = None;

    def setup_simulator(self, sim_params):
        # general simulator setup
        # the simulator
        n_trials = sim_params.n_trials
        n_signals = sim_params.n_trials


