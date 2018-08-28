from statsmodels.distributions.empirical_distribution import ECDF
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import logging
import json
import os
import seaborn as sns

logger = logging.getLogger(__name__)

metric_map = {"FDR": "empirical_fdr",
              "Power": "empirical_power",
              "NumRej": "num_rejections"}



def plot_box_plot(res_dir, test_method, adj_method, metric, save_to=""):
    # read the summary data
    df = pd.read_csv(os.path.join(res_dir, "summary", "trial_summary.csv"))
    fname = "node_{}_{}.csv".format(test_method, adj_method)
    node_df = pd.read_csv(os.path.join(res_dir, "summary", fname), index_col=0)
    regimes = node_df.columns.values
    with open(os.path.join(res_dir, "meta_restore_params.json")) as json_file:
        alpha = json.load(json_file)["test_params"]["method_alpha"][0]

    rule = (df["adjustment_method"] == adj_method) & (df["testing_method"] == test_method)
    subdf = df.loc[rule]
    sub_df = subdf[["regime_id",
                    "repetition_id",
                    metric_map[metric]]]
    fig, ax = plt.subplots(figsize=(3.4,2.9))
    bp = sub_df.boxplot(column=metric_map[metric],
                           by="regime_id",
                           ax=ax,
                           return_type="dict",
                           sym="x",
                           patch_artist=True)
    ax.set_title(metric)
    ax.grid(False)
    ax.spines['right'].set_visible(False)
    ax.spines['top'].set_visible(False)
    ax.set_ylim(-0.05, 1.05)

    border_col = 'black'
    border_width = 1

    if metric == "FDR":
        mid_border_col = "#000080";
        face_col = "#BFFFFF";
    elif metric == "Power":
        mid_border_col = "darkorange";
        face_col = "#FFFABF";
    else:
        mid_border_col = border_col;

    if metric == "FDR":
        ax.axhline(y=alpha, color='red', linestyle='--', linewidth=1)

    for key in bp.keys():
        # borders
        for item in bp[key]["boxes"]:
            item.set_facecolor(face_col)
            item.set_edgecolor(border_col)
        for categ in ['caps', 'whiskers']:
            for item in bp[key][categ]:
                # change outline color
                # box.set( color='#7570b3', linewidth=2)
                item.set_color(border_col)
                item.set_linewidth(border_width)
                # change fill color
                # box.set( facecolor = '#1b9e77' )
        for categ in ['means', 'medians']:
            for item in bp[key][categ]:
                item.set_color(mid_border_col)
                item.set_linewidth(1)

    tickfontsize = 10
    plt.tick_params(which='major', length=5)

    plt.xticks(np.arange(1,len(regimes)+1), regimes)
    for label in ax.get_xticklabels():
        label.set_fontproperties("Arial")
        label.set_fontsize(tickfontsize)
    for label in ax.get_yticklabels():
        label.set_fontproperties("Arial")
        label.set_fontsize(tickfontsize)
    plt.xlabel("")
    plt.title("")
    plt.suptitle("")
    plt.gca().set_position([0, 0, 1, 1])
    # https://stackoverflow.com/questions/24525111/how-can-i-get-the-output-of-a-matplotlib-plot-as-an-svg
    if save_to:
        fn = os.path.join(save_to, "{}_{}_{}.pdf".format(metric, test_method, adj_method))
        print("Saving to: {}".format(fn))
        plt.savefig(fn, transparent=True, bbox_inches='tight')
    plt.show()


def plot_all_summary(res_dir):

    # main data and parameters
    df = pd.read_csv(os.path.join(res_dir, "summary", "trial_summary.csv"), index_col=0)
    with open(os.path.join(res_dir, "meta_restore_params.json")) as json_file:
        test_params = json.load(json_file)["test_params"]
    method_test = test_params["method_test"]
    method_madj = test_params["method_madj"]
    metrics = test_params["report_metrics"]
    alpha = test_params["method_alpha"][0]

    # additional parameters
    if (len(method_madj) == 2):
        method_cols = ["#0020AE", "#FFA200"]
    else:
        assert 0, "Need to manually define colors?"
    fig, axes = plt.subplots(nrows=len(metrics),
                             ncols=len(method_test),
                             sharey="row",
                             sharex="col",
                             figsize = (14,8))
    num_rej_max = 0
    for i_row in range(len(metrics)):
        for i_col in range(len(method_test)):
            ax = axes[i_row][i_col]
            method = method_test[i_col]
            metric = metrics[i_row]

            rule = (df["testing_method"] == method)
            subdf = df.loc[rule]
            subdf = subdf[["regime_id", "repetition_id", "adjustment_method", metric_map[metric]]]


            in_dict = {}
            for adj in  method_madj:
                in_dict[adj] = {}
                subsubdf = subdf.loc[subdf["adjustment_method"] == adj]
                group = subsubdf[["regime_id", metric_map[metric]]].groupby("regime_id")
                mean = list(group.mean()[metric_map[metric]])
                std = list(group.std()[metric_map[metric]])
                in_dict[adj] = {"mean": mean, "err": std }
            plot_group_bars(in_dict,
                            method_madj,
                            method_cols,
                            ax=ax)

            if i_col == 0:
                ax.set_ylabel(metric)
            if i_row == axes.shape[0] - 1:
                ax.set_xlabel("Regime")
            if metrics[i_row] == "FDR":
                ax.set_ylim(0,1)
                ax.axhline(y=alpha, color='k', linestyle='--', linewidth=1)
            if metrics[i_row] == "Power":
                ax.set_ylim(0,1)
            if metrics[i_row] == "NumRej":
                ymin, ymax = ax.get_ylim()
                if ymax > num_rej_max:
                    num_rej_max = ymax
                ax.set_ylim(0,num_rej_max)
            if i_col == 0 and i_row == 0:
                pass
            else:
                ax.legend_.remove()
    for ax, col in zip(axes[0], method_test):
        ax.set_title(col)
    plt.tight_layout()


def plot_group_bars(grp_data,
                    grp_ids,
                    grp_cols,
                    yval="mean",
                    yerr="err",
                    xtick_labs=None,
                    ax=None):
    # grp_data would be a dict of elements of mean, std vectors
    # grp_id indicate the order in which the bars will be plotted
    # grp_cols indicate the colors of the grp]
    bwidth = 0.35 # the bar width
    ngrps = len(grp_ids)
    loffset = len(grp_ids) * bwidth / 2
    if ax is None:
        fig, ax = plt.subplots()
    grp_plt = []
    for grp_i, grp_name in enumerate(grp_ids):
        i_mean = grp_data[grp_name][yval]
        i_err = grp_data[grp_name][yerr]
        i_len = len(i_mean)
        i_col = grp_cols[grp_i]
        assert i_len > 0, "data length must be positive!"
        ind = np.arange(i_len)    # the x locations for the groups
        p = ax.bar(ind + grp_i * bwidth,
                   i_mean,
                   loffset,
                   color=i_col,
                   bottom=0,
                   yerr=i_err)
        grp_plt.append(p)
    # handle x-labels and ticks
    if not xtick_labs:
        xtick_labs = ind
    ax.set_xticks(ind + (ngrps - 1) * bwidth / 2)
    ax.set_xticklabels(xtick_labs)
    # handle y-labels and ticks
    ymin, ymax = ax.get_ylim()
    ax.set_ylim(0, ymax)
    ax.legend(grp_plt, grp_ids)
    ax.autoscale_view()

def print_result_eval(dag, data, params, print_rej=False):
    method="BH"
    for ttype in ["comp"]:
        nonnulls = [i for i, nnull in enumerate(data["node_meta"][ttype + "_nonnull"]) if nnull == 1]
        print("{} nonulls: {}".format(ttype, nonnulls))
        for i in range(params["n_regimes"]):
            print("---- Regime: {} -----".format(i))
            for j in range(params["n_reps"]):
                trial_id = dag.main_statistician.simulator.rrid_to_tid(i, j)
                if print_rej:
                    print("Rejections: {}".format(data["trial_node_rejects"][ttype][method][trial_id]))
                print("            {}".format(data["trial_sum_stat"][ttype][method][trial_id]))
        print("")

def plot_stem_order_by(df, x, y, lab, ax=None, lab_cols=None, lab_alias=None):
    # sort by x and only include rank
    # plot rank, y, and color by lab
    # sort data frame by x
    df_sorted = df.sort_values(by=[x])
    df_sorted["rank"] = np.arange(len(df_sorted[x]))
    # assign each label a color
    for label in np.unique(df[lab]):
        df_sub = df_sorted.loc[df_sorted[lab]==label]
        xvals = df_sub["rank"]
        yvals = df_sub[y]
        markerline, stemlines, baseline = ax.stem(xvals, yvals, label=lab_alias[label])
        plt.setp(baseline, color='k')
        plt.setp(markerline, 'color', lab_cols[label], markersize=2.5)
        plt.setp(stemlines, 'color', plt.getp(markerline,'color'))


def plot_ecdf(pvals, ax):
    ecdf = ECDF(pvals)
    ax.plot(ecdf.x, ecdf.y)
    ax.plot([0, 1], [0, 1], ls="--", c=".3")

def plot_specific_pvals(dag, data_dir, reg_i, rep_i, fname=None):
    mstat = dag.main_statistician
    pad = 5 # in points

    pval_df = pd.DataFrame.from_dict(mstat.get_node_meta_dict())
    # print(pval_df.head())
    nn_genes = mstat.nonnull_genes
    print("nonull genes ({})".format(len(nn_genes)))
    for ttype in ["comp", "self"]:
        nn_nodes = mstat.nonnull_nodes[ttype+"_nonnull"]
        print("{} nonulls ({})".format(ttype, len(nn_nodes)))

    plot_types = ["pvals ranked by node size", "pvals ranked in order", "empricial CDF of pvals"]
    xlabel_text = ["node size rank", "p-value rank", "p-value"]
    method_types = mstat.method_test[::-1]
    fig, axes = plt.subplots(len(method_types),
                             len(plot_types),
                             sharey=True,
                             figsize=(3*len(plot_types), 3*len(method_types)))
    for i in range(len(method_types)):
        mmeth = method_types[i]
        if mmeth in ["simes", "binomial"]:
            null_type = "self_nonnull"
        else:
            null_type = "comp_nonnull"

        row_txt = "{}".format(mmeth)
        # print("----- Method: {} -----".format(row_txt))
        # ax[i, 0].set_ylabel(, rotation=0, size='large')
        ax = axes[i, 0]
        ax.annotate(row_txt, xy=(0, 0.5), xytext=(-ax.yaxis.labelpad - pad, 0),
                    xycoords=ax.yaxis.label, textcoords='offset points',
                    size='large', ha='right', va='center')

        pvals, rej, _ = dag.load_test_result(data_dir, reg_i, rep_i, mmeth)
        pvals = np.array(pvals)
        BH_rej = rej["BH"]
        # print(BH_rej)
        if len(BH_rej) == 0:
            max_pval = 0.0
        else:
            max_pval = np.max(pvals[BH_rej])
        pval_df["p-value"] = pvals
        # print(pval_df.head())
        # print("Number of p-values: {}".format(len(pvals)))
        for j,plot_type in enumerate(plot_types):
            # core plots
            ax = axes[i, j]
            if j == 0:
                plot_stem_order_by(pval_df,
                   "volume", "p-value", null_type, ax,
                   lab_cols = ["grey","red"],
                   lab_alias=["null", "non-null"])
                # ax.legend()
                ax.set_ylabel("p-value")
            if j == 1:
                plot_stem_order_by(pval_df,
                   "p-value", "p-value", null_type, ax,
                   lab_cols = ["grey","red"],
                   lab_alias=["null", "non-null"])
                ax.axhline(y=max_pval, linestyle='--', color="b")
                ax.axvline(x=len(BH_rej), linestyle='--', color="b")
                ax.set_ylabel("p-value")
            if j == 2:
                plot_ecdf(pvals, ax)
                ax.set_ylabel("probability")
        # print("")
        for j, colname in enumerate(plot_types):
            ax = axes[0, j]
            ax.annotate(colname, xy=(0.5, 1), xytext=(0.5, pad*2),
                        xycoords='axes fraction', textcoords='offset points',
                        size='large', ha='center', va='baseline')
            for j,plot_type in enumerate(plot_types):
                axes[-1, j].set_xlabel(xlabel_text[j])
    #     plt.suptitle(title)
        plt.tight_layout()
        plt.subplots_adjust(top=0.9)

    plt.show()


# def plot_multiple_pval_df(dag, data, params, fixed_size=True, fname=None):
#     pval_df = pd.DataFrame.from_dict(data["node_meta"])
#     mstat = dag.main_statistician

#     # def plot_comp_pvals(dag, data, params):
#     ttype = "comp"
#     nn_genes = mstat.nonnull_genes
#     nn_nodes = mstat.nonnull_nodes[ttype+"_nonnull"]
#     print("{} nonulls: {}".format(ttype, nn_nodes))
#     print("nonull genes ({}) : {}".format(len(nn_genes),nn_genes))
#     print("{} nodes ({}): {}".format(ttype, len(nn_nodes) ,nn_nodes))
#     title = "non-null genes: {}; competitive non-null nodes: {}".format(
#         len(nn_genes), len(nn_nodes))
#     n_regimes = params["n_regimes"]
#     plot_types = ["pvals ranked by node size", "pvals ranked in order", "empricial CDF of pvals"]
#     xlabel_text = ["node size rank", "p-value rank", "p-value"]
#     pad = 5 # in points
#     fig, axes = plt.subplots(n_regimes, len(plot_types), sharey=True, figsize=(3*len(xlabel_text), 3*n_regimes))
#     for i in range(n_regimes):
#         row_txt = "Regime: {}".format(i)
#         print("----- {} -----".format(row_txt))
#         # ax[i, 0].set_ylabel(, rotation=0, size='large')
#         ax = axes[i, 0]
#         ax.annotate(row_txt, xy=(0, 0.5), xytext=(-ax.yaxis.labelpad - pad, 0),
#                     xycoords=ax.yaxis.label, textcoords='offset points',
#                     size='large', ha='right', va='center')
#         for k in range(params["n_reps"]):
#             trial_id = dag.main_statistician.simulator.rrid_to_tid(i, k)
#             pvals = np.array(data["trial_node_pvalues"][ttype][trial_id])
#             # figure out the BH threshold
#             method = "BH"
#             BH_rej = data["trial_node_rejects"][ttype][method][trial_id]
#             # print(pvals[BH_rej])
#             if len(BH_rej) == 0:
#                 max_pval = 0.0
#             else:
#                 max_pval = np.max(pvals[BH_rej])
#             pval_df["p-value"] = pvals
#             print("Plotting repetition: {}".format(k))
#             # print(pval_df.head())
#             print("Number of p-values: {}".format(len(pvals)))
#             for j,plot_type in enumerate(plot_types):
#                 # core plots
#                 ax = axes[i, j]
#                 if j == 0:
#                     plot_stem_order_by(pval_df,
#                        "volume", "p-value", "comp_nonnull", ax,
#                        lab_cols = ["grey","red"],
#                        lab_alias=["comp null", "comp non-null"])
#                     ax.legend()
#                     ax.set_ylabel("p-value")
#                 if j == 1:
#                     plot_stem_order_by(pval_df,
#                        "p-value", "p-value", "comp_nonnull", ax,
#                        lab_cols = ["grey","red"],
#                        lab_alias=["comp null", "comp non-null"])
#                     ax.axhline(y=max_pval, linestyle='--', color="b")
#                     ax.axvline(x=len(BH_rej), linestyle='--', color="b")
#                     ax.set_ylabel("p-value")
#                 if j == 2:
#                     plot_ecdf(pvals, ax)
#                     ax.set_ylabel("probability")
#             break # only include one rep per regime for the p-values
#         print("")
#     for j, colname in enumerate(plot_types):
#         ax = axes[0, j]
#         ax.annotate(colname, xy=(0.5, 1), xytext=(0.5, pad*2),
#                     xycoords='axes fraction', textcoords='offset points',
#                     size='large', ha='center', va='baseline')
#         for j,plot_type in enumerate(plot_types):
#             axes[-1, j].set_xlabel(xlabel_text[j])
#     plt.suptitle(title)
#     plt.tight_layout()
#     plt.subplots_adjust(top=0.9)
#     if fname:
#         plt.savefig(fname, bbox_inches='tight')
#     plt.show()


def plot_sim_data_result(simdata, simulator, fname=None):
    print("nonull genes ({}) : {}".format(len(simdata["nonnull_genes"]),simdata["nonnull_genes"]))
    for test_type in simdata["nonnull_nodes"]:
        print("{} nodes ({}): {}".format(test_type, len(simdata["nonnull_nodes"][test_type]), simdata["nonnull_nodes"][test_type]))
    nn_genes = simdata["nonnull_genes"]
    nn_nodes = simdata["nonnull_nodes"][test_type]
    title = "non-null genes: {}; competitive non-null nodes: {}; self-contained non-null nodes: {}".format(
        len(nn_genes), len(nn_nodes), len(simdata["nonnull_nodes"]["comp_nonnull"]))
    pvalue_data = simdata["trial_sum_stat"]

    plot_dfs = {}
    for test_type in pvalue_data:
        summary_df = pd.DataFrame()
        for method in pvalue_data[test_type]:
            sub_df = pd.DataFrame.from_dict(pvalue_data[test_type][method])
            sub_df["method"]=method
            sub_df["trial_id"] = sub_df.index
            # get the signal regime id and the replication id based on the trial id
            sub_df["regime"] = sub_df["trial_id"].apply(
                lambda x: simulator.regime_names[simulator.tid_to_rrid(x)[0]])
            sub_df["repetition"] =  sub_df["trial_id"].apply(
                lambda x: simulator.tid_to_rrid(x)[1])
            summary_df = pd.concat([summary_df, sub_df])
        plot_dfs[test_type] = summary_df

        # cols = {"BH":"#e74c3c", "Bonferroni":"#3498db"}
    cols = ["#FF8C00", "#3498db"]

    sns.set(font_scale=2) # fond size
    sns.set_style("white", {'axes.facecolor': 'white',
                            'axes.grid': True,
                            'axes.linewidth': 2.0,
                            'grid.linestyle': u'--',
                            'grid.linewidth': 4.0,
                            'xtick.major.size': 5.0,
                           })

    metric_names = list(pvalue_data[test_type][method][0].keys())
    test_types = list(plot_dfs.keys())
    methods = list(pvalue_data[test_type].keys())
    fig, axes = plt.subplots(len(metric_names),
                             len(test_types),
                             sharex='col',
                             sharey='row',
                             figsize=(20, 15))
    label_sizes = 24
    for row in range(len(metric_names)):
        for col in range(len(test_types)):
            metric = "{} ({} test)".format(metric_names[row], test_types[col])
            ax = axes[row][col]
            ax.set_title(metric)
            sns.barplot(x="regime",
                        y=metric_names[row],
                        hue="method",
                        data=plot_dfs[test_types[col]],
                        palette=cols,
                        ax=ax)

            if row == 0:
                ax.axhline(y=0.10, color='k', linestyle='--', linewidth=2)

            if not (row == 0 and col == 1):
                ax.legend_.remove()
            if col > 0:
                ax.set_ylabel("")
            # add target coverage on the first plot
            if row < len(metric_names)-1:
                ax.set_xlabel("")
            else:
                ax.set_xlabel("signal gene effect size", fontsize=22)
            ax.xaxis.label.set_size(label_sizes)
            ax.yaxis.label.set_size(label_sizes)
    plt.suptitle(title, size=25)
    plt.tight_layout()
    if fname:
        plt.subplots_adjust(top=0.88)
        plt.savefig(fname, bbox_inches='tight')
    plt.show()
