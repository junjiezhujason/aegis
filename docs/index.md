
# Welcome!

This is the documentation webpage for AEGIS (Augmented Exploration of the GO with Interactive Simulations). AEGIS is an open-source software with an interactive information-retrieval framework that enables an investigator to navigate through the entire Gene Ontology (GO) graph (with tens of thousands of nodes) and focus on fine-grained details without losing the context. It features interpretable visualization of GO terms reported from studies, flexible exploratory analysis of the GO DAG, as well as principled power analysis that is biologically grounded.

### Quick links

- [Our published paper with method details](https://www.nature.com/articles/s41598-019-42178-x)
- [Video tutorials of our visual concepts](./tutorial)
- [Source code in Python and Javascript](https://github.com/junjiezhujason/aegis)
- [Contact us for feedback or cite our work](./#contact-us)

---

## Behind the Name

According to [Greek Mythology](http://greekmythology.wikia.com/wiki/Aegis), Perseus used Athena’s shield to look at Medusa's reflection without being petrified.
This shield that empowered Perseus to defeat Medusa later became the AEGIS.
To see the object of interest in a way that is manageable and informative, one cannot directly “look at it,” but appropriate visualization tools are needed.

The [modern concept](https://en.wikipedia.org/wiki/Aegis) of doing something
"under someone's aegis" means doing something under the protection of a powerful,
knowledgeable, or benevolent source. By combining visualization with the rich knowledge in the Gene Ontology, we hope to offer scientists a new tool to discover hidden patterns and uncover the gems in their data.

<div class="story-block">
    <img src="img/aegis_painting.jpg" width="100%"/>
      <b>Minerve remettant à Persée son bouclier avec lequel il doit combattre La Méduse </b>
      <br />
      by Houasse René Antoine
      (<a href="https://en.muzeo.com/art-print/minerve-remettant-a-persee-son-bouclier-avec-lequel-il-doit-combattre-la-meduse/houasse">Image Source</a>)
</div>


---

## Getting Started

You can [install](./install) our software locally and accompanied by our
[tutorials](./tutorial), there are two options to explore the visualization by AEGIS:
the lite version and the full version.

### The lite version

A light weight version of AEGIS includes the minimal interactive features with some examples for simple demonstrations. The lite version does not require the cached data download and serves as an introduction to our visualization concepts.

### The full version

The full version includes all features, including data upload and power analysis functions. This version includes more customization and computationally intensive processes.


---

## The Gene Ontology

The GO is one of the most popular biological knowledge bases. It consists of two continuously evolving elements: (1) a collection of controlled biological terms with semantic hierarchical relationships and (2) annotations that link genes and gene products to specific terms. The GO can be represented as a graph where each node represents a GO term, and each directed link pointing from a parent to a child represents the semantic relationship with two terms. The child term can be related to the parent term via an “is a”, “part of” or “regulates” relation. There are three root nodes: “biological process”, “molecular function” and “cellular component”, and each of their descendants are connected with directed edges in an acyclic fashion. Genes can be simultaneously annotated to different terms, and their annotations propagate upwards in the hierarchy, resulting in the gene sets in the nodes.

For more detailed information about the GO, please visit
[the GO Consortium](http://geneontology.org/page/introduction-go-resource)
and
[the GO Handbook](http://gohandbook.org/doku.php).


<div class="go-block">
    <img src="img/go_overview.png" width="100%"/>
</div>

---

## Contact Us

AEGIS is developed and maintained by
[Junjie (Jason) Zhu]("http://jasonjunjiezhu.com/")
in the
[Sabatti Lab](http://statweb.stanford.edu/~sabatti/)
at
[Stanford University](https://www.stanford.edu/).
Both
[Qian Zhao](https://stanfordwho.stanford.edu/SWApp/detailAction.do?key=DR337X062%20%20%20%20%20%20%20&search=Zhao&soundex=&stanfordonly=&affilfilter=everyone&filters=)
and
[Eugene Katsevich](http://web.stanford.edu/~ekatsevi/)
have also contributed to the development of this project.

Feel free to contact `jjzhu AT stanford DOT edu` for feedback and quesitons. You are welcome to provide feedback via [this questionnaire](./questionnaire/questionnaire.pdf).

---

## How to Cite
```
@article{zhu2019exploratory,
  title={Exploratory Gene Ontology Analysis with Interactive Visualization},
  author={Zhu, Junjie and Zhao, Qian and Katsevich, Eugene and Sabatti, Chiara},
  journal={Scientific reports},
  volume={9},
  number={1},
  pages={7793},
  year={2019},
  publisher={Nature Publishing Group}
}
```
